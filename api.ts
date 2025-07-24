import sqlite3 from 'sqlite3';

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
    db: sqlite3.Database;

    constructor() {
        this.db = new sqlite3.Database('../db.sqlite3');
    }

    async getTracksByArtist(artistName: string): Promise<TrackList[]> {
        return new Promise((resolve, reject) => {
            this.db.all<TrackList>(
                `SELECT * FROM tracks WHERE artist_name_lower = ?`,
                [artistName.toLowerCase()],
                (err, rows) => {
                    if (err) {
                        console.error('Error fetching data:', err);
                        reject(err);
                    } else {
                        resolve(rows);
                    }
                }
            );
        });
    }

    async getLyricsByTrackId(trackId: number): Promise<LyricList | null> {
        return new Promise((resolve, reject) => {
            this.db.all<LyricList>(
                `SELECT * FROM lyrics WHERE track_id = ?`,
                [trackId],
                (err, rows) => {
                    if (err) {
                        console.error('Error fetching data:', err);
                        reject(err);
                    } else {
                        resolve(rows.length > 0 ? rows[0]! : null);
                    }
                }
            );
        });
    }

}