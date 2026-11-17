
import { Capacitor, registerPlugin } from "@capacitor/core";

export interface MusicSong {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: number;
  name: string;
  uri: string;
}

interface MusicLibraryPlugin {
  requestAccess(): Promise<{
    songs: MusicSong[];
  }>;

  getSongFile(options: {
    id: number;
  }): Promise<{
    path: string;
  }>;
}

const MusicLibrary = registerPlugin<MusicLibraryPlugin>(
  "MusicLibrary"
);

export async function getSongUrl(id: number): Promise<string> {
  const result = await MusicLibrary.getSongFile({ id });
  return Capacitor.convertFileSrc(result.path);
}

export default MusicLibrary;
