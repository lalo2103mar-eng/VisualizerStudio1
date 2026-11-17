
import { registerPlugin } from "@capacitor/core";

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
}

const MusicLibrary = registerPlugin<MusicLibraryPlugin>(
  "MusicLibrary"
);

export default MusicLibrary;
