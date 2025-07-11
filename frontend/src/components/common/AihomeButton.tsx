import styles from "./AihomeButton.module.css";
import { useState } from "react";
import { TrackCard, ArtistCard, AlbumCard } from "../features/Cards";
import { ImSpinner2 } from "react-icons/im";
import shared from "@/styles/shared.module.css";
import { fetchWithService } from "@/utils/api";

/**
 * Component that fetches AI recommendations for tracks, albums, and artists.
 */
export default function AiHomeButton() {
  const [results, setResults] = useState<{
    tracks: any[];
    albums: any[];
    artists: any[];
  }>({ tracks: [], albums: [], artists: [] });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setError(null);
    setResults({ tracks: [], albums: [], artists: [] });
    setLoading(true);

    try {
      const prompt = `
Recommend 10 random tracks, 10 random artists, and 10 random albums.
Return *only* a valid JSON object with exactly 3 keys: "tracks", "artists", and "albums".
Each key must map to an array of names (strings).
No explanations or extra text — only valid JSON.

Example:
{
  "tracks": ["Track 1", "Track 2"],
  "artists": ["Artist 1", "Artist 2"],
  "albums": ["Album 1", "Album 2"]
}
`;
      const aiResponse = await fetchWithService(
        "/ai/recommend-home",
        "BACKEND",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt }),
        }
      );

      if (!aiResponse.ok) throw new Error("Failed to fetch AI recommendations");

      const aiData = await aiResponse.json();
      const [trackRes, artistRes, albumRes] = await Promise.all([
        fetchWithService(
          `/spotify/tracks?ids=${aiData.results.tracks
            .map((t: any) => t.id)
            .join(",")}`,
          "MUSIC_SERVICE"
        ),
        fetchWithService(
          `/spotify/artists?ids=${aiData.results.artists
            .map((a: any) => a.id)
            .join(",")}`,
          "MUSIC_SERVICE"
        ),
        fetchWithService(
          `/spotify/albums?ids=${aiData.results.albums
            .map((a: any) => a.id)
            .join(",")}`,
          "MUSIC_SERVICE"
        ),
      ]);

      if (!trackRes.ok || !artistRes.ok || !albumRes.ok) {
        throw new Error("One or more Spotify fetches failed");
      }

      const [trackData, artistData, albumData] = await Promise.all([
        trackRes.json(),
        artistRes.json(),
        albumRes.json(),
      ]);

      setResults({
        tracks: trackData.tracks,
        artists: artistData.artists,
        albums: albumData.albums,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <button
        onClick={handleClick}
        className={styles.button}
        disabled={loading}
      >
        Ask AI
      </button>
      {loading && (
        <div className={shared.loading} data-testid="loading-spinner">
          <ImSpinner2 />
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
      {results.tracks.length > 0 &&
        results.artists.length > 0 &&
        results.albums.length > 0 && (
          <div className={styles.columns}>
            <div>
              <h2 className={styles.title}>Tracks</h2>
              {results.tracks.map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
            <div>
              <h2 className={styles.title}>Albums</h2>
              {results.albums.map((album) => (
                <AlbumCard key={album.id} album={album} />
              ))}
            </div>
            <div>
              <h2 className={styles.title}>Artists</h2>
              {results.artists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          </div>
        )}
    </div>
  );
}
