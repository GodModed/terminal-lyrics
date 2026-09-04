export type TrackList = {
    id: number;
    name: string;
    name_lower: string;
    artist_name: string;
    artist_name_lower: string;
    album_name: string;
    album_name_lower: string;
    duration: number;
    last_lyric_id: number;
}

export type LyricList = {
    track_id: number;
    plain_lyrics: string;
    synced_lyrics: string;
}


export default class API {

    async getTracksBySearch(query: string): Promise<TrackList[]> {
        // return new Promise((resolve, reject) => {
        //     this.db.all<TrackList>(
        //         `SELECT * FROM tracks WHERE artist_name_lower = ?`,
        //         [artistName.toLowerCase()],
        //         (err, rows) => {
        //             if (err) {
        //                 console.error('Error fetching data:', err);
        //                 reject(err);
        //             } else {
        //                 resolve(rows);
        //             }
        //         }
        //     );
        // });

        const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        
        return Object.keys(json).map(key => {
            const obj = json[key];
            return {
                id: obj.id,
                name: obj.name,
                name_lower: obj.name.toLowerCase(),
                artist_name: obj.artistName,
                artist_name_lower: obj.artistName.toLowerCase(),
                album_name: obj.albumName,
                album_name_lower: obj.albumName.toLowerCase(),
                duration: obj.duration,
                last_lyric_id: obj.id
            }
        });

    }

    async getLyricsByTrackId(trackId: number): Promise<LyricList | null> {
        const res = await fetch(`https://lrclib.net/api/get/${encodeURIComponent(trackId)}`);
        const json = await res.json();

        return {
            track_id: trackId,
            plain_lyrics: json.plainLyrics,
            synced_lyrics: json.syncedLyrics
        };

    }

}