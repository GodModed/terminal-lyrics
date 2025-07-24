import React, { useState, useEffect } from 'react';
import { Box, render, Spacer, Text, useInput } from 'ink';
import sqlite3 from "sqlite3";
import API, { type LyricList, type TrackList } from './api';

const api = new API();

type AppState = "selecting" | "playing";

function App() {

    useInput((input, key) => {
        if (key.escape) {
            process.exit();
        }
    });

    const [appState, setAppState] = useState<AppState>("selecting");
    const [selectedTrack, setSelectedTrack] = useState<TrackList | null>(null);

    return (
        <>
            {appState === "selecting" ? (
                <SelectSong
                    onSelect={(track) => {
                        setSelectedTrack(track);
                        setAppState("playing");
                    }}
                />
            ) : (
                <PlaySong track={selectedTrack} />
            )}
        </>
    )

}

function PlaySong({
    track
}: {
    track: TrackList | null;
}) {
    if (!track) {
        return <Text>No track selected</Text>;
    }

    const [parsedLyrics, setParsedLyrics] = useState<{
        ms: number;
        text: string;
    }[]>([]);
    const [started, setStarted] = useState(false);
    const [currentLyricIndex, setCurrentLyricIndex] = useState(0);
    const [currentLyricPartial, setCurrentLyricPartial] = useState<string>('');

    useEffect(() => {
        api.getLyricsByTrackId(track.id)
            .then((lyrics) => {
                if (!lyrics) {
                    console.log("No lyrics found for this track.");
                } else {
                    const lines = lyrics.synced_lyrics.split('\n');
                    // text in between brackets is the time in seconds
                    const parsedLyrics = lines.map(line => {
                        const match = line.split('[')[1]?.split(']')[0];
                        if (match) {
                            let [min, sec] = match.split(':').map(Number);
                            if (!min) min = 0;
                            if (!sec) sec = 0;

                            const absoluteMs = (min * 60 + sec) * 1000;

                            return {
                                absoluteMs,
                                text: line.split(']')[1]?.trim()
                            };
                        }
                    }).filter(Boolean) as { absoluteMs: number; text: string }[];
                    
                    // Calculate delays between consecutive lyrics
                    const parsedLyricsWithDelays = parsedLyrics.map((lyric, index) => {
                        const delay = index === 0 ? lyric.absoluteMs : lyric.absoluteMs - (parsedLyrics[index - 1]?.absoluteMs || 0);
                        return {
                            ms: delay,
                            text: lyric.text
                        };
                    });
                    
                    setParsedLyrics(parsedLyricsWithDelays);
                    setStarted(true);
                }
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        if (!started || parsedLyrics.length == 0) return;
        if (currentLyricIndex >= parsedLyrics.length) {
            return process.exit();
        }
        
        const currentLyric = parsedLyrics[currentLyricIndex];
        const timeout = setTimeout(() => {
            setCurrentLyricIndex(prev => prev + 1);
            setCurrentLyricPartial('');
        }, currentLyric?.ms);

        return () => clearTimeout(timeout);
    }, [started, parsedLyrics, currentLyricIndex]);

    useEffect(() => {
        const currentLyric = parsedLyrics[currentLyricIndex - 1];
        const currentTime = parsedLyrics[currentLyricIndex]?.ms || 0;
        if (!currentLyric || currentLyric.text.length === 0 || currentTime <= 0) return;
        const msPerChar = currentTime / currentLyric.text.length;
        setCurrentLyricPartial(currentLyric.text.slice(0, currentLyricPartial.length + 1));
        const interval = setInterval(() => {
            setCurrentLyricPartial(prev => {
                if (prev.length < currentLyric.text.length) {
                    return prev + currentLyric.text[prev.length];
                }
                return prev;
            });
        }, msPerChar);

        return () => clearInterval(interval);
    }, [currentLyricIndex]);

    return (
        <Box flexDirection="column">
            <Text>Playing {track.name} by {track.artist_name}</Text>
            <Spacer />
            <Text>Duration: {track.duration} seconds</Text>
            <Spacer />
            {parsedLyrics.map((lyric, index) => (
                index > currentLyricIndex - 2 ?
                index == currentLyricIndex - 1 ? (
                    <Text key={index} dimColor={false}>
                        {currentLyricPartial}
                    </Text>
                ) : null
                : 
                <Text key={index} dimColor={index === currentLyricIndex - 1 ? false : true}>
                        {lyric.text}
                </Text>
            ))}

        </Box>
    );
}

function SelectSong({
    onSelect
}: {
    onSelect: (track: TrackList) => void;
}) {

    useInput((input, key) => {
        if (key.tab) {
            setAuthorSelected(!authorSelected);
        }
    });

    const [authorSelected, setAuthorSelected] = useState<boolean>(true);
    const [inputValue, setInputValue] = useState<string>('');
    const [songSearch, setSongSearch] = useState<string>('');
    const [data, setData] = useState<TrackList[]>([]);
    const [filteredData, setFilteredData] = useState<TrackList[]>([]);


    useEffect(() => {
        const timeoutId = setTimeout(() => {
            // if (inputValue.trim()) {
            //     db.all<TrackList>(`SELECT * FROM tracks WHERE artist_name_lower = ?`, [inputValue.toLowerCase()], (err, rows) => {
            //         if (err) {
            //             console.error('Error fetching data:', err);
            //             process.exit(1);
            //             return;
            //         }
            //         setData(rows);
            //     });
            // } else {
            //     setData([]);
            // }
            if (inputValue.trim()) {
                api.getTracksByArtist(inputValue).then(rows => {
                    setData(rows);
                }).catch(err => {
                    console.error('Error fetching data:', err);
                    process.exit(1);
                });
            } else {
                setData([]);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [inputValue]);

    useEffect(() => {
        let newData = data.filter(track => track.name.toLowerCase().includes(songSearch.toLowerCase()));
        // remove duplicate tracks
        newData = newData.filter((track, index, self) =>
            index === self.findIndex((t) => (
                t.name === track.name
            ))
        );
        setFilteredData(newData);
    }, [data, songSearch])

    return (
        <>
            <Box flexDirection='row'>
                <Box borderStyle={'round'} marginTop={1} marginBottom={1} width={"50%"}>
                    <Input
                        onChange={setInputValue}
                        value={inputValue}
                        onSubmit={() => { }}
                        selected={authorSelected}
                    />
                </Box>
                <Box borderStyle={'round'} marginTop={1} marginBottom={1} width={"50%"}>
                    <Input
                        onChange={setSongSearch}
                        value={songSearch}
                        onSubmit={() => { }}
                        selected={!authorSelected}
                    />
                </Box>
            </Box>
            <Box marginTop={1} marginBottom={1} borderStyle={'round'} padding={1}>
                <List
                    data={filteredData}
                    onSelect={(track) => {
                        onSelect(track);
                    }}
                />
            </Box>
        </>
    )
}

function List({
    data,
    limit = 10,
    onSelect
}: {
    data: TrackList[];
    limit?: number;
    onSelect: (track: TrackList) => void;
}) {

    const [offset, setOffset] = useState(0);

    useEffect(() => {
        setOffset(0);
    }, [data]);

    useInput((input, key) => {
        if (key.upArrow) {
            setOffset(prev => Math.max(prev - 1, 0));
        } else if (key.downArrow) {
            setOffset(prev => Math.min(prev + 1, data.length - 1));
        } else if (key.return && data[offset]) {
            onSelect(data[offset]);
        }
    });

    const displayedTracks = data.slice(offset, offset + limit);
    return (
        <Box flexDirection="column">
            {new Array(limit).fill(null).map((_, index) => {
                const track = displayedTracks[index];
                if (!track) return <Text key={index} > </Text>; // Fill empty slots with empty Text
                return (
                    <Text key={track.id}>
                        {index === 0 ? '> ' : '  '}
                        {track.name}
                    </Text>
                );
            })}
        </Box>
    );
}

function Input({
    onChange,
    value,
    onSubmit,
    selected = true
}: {
    onChange: (value: string) => void;
    value: string;
    onSubmit: () => void;
    selected?: boolean;
}) {

    const [blink, setBlink] = useState(false);

    useEffect((() => {

        setBlink(selected);

        const interval = setInterval(() => {
            setBlink(prev => {
                if (!selected) return false;
                return !prev;
            });
        }, 500);

        return () => clearInterval(interval);
    }), [selected]);

    useInput((input, key) => {
        if (!selected) return;
        if (key.delete || key.backspace) {
            onChange(value.slice(0, -1));
        }
        else if (key.return) {
            onSubmit();
        } else if (input) {
            onChange(value + input);
        }
    });

    return (
        <Box flexDirection='row'>
            <Text>{value}</Text>
            <Text>{blink && selected ? '█' : ' '}</Text>
        </Box>
    );
}

render(<App />);