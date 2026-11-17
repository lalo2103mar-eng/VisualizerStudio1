package com.visualizerstudio.app;

import android.Manifest;
import android.content.ContentUris;
import android.database.Cursor;
import android.net.Uri;
import android.os.Build;
import android.provider.MediaStore;
import com.getcapacitor.annotation.PermissionCallback;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

@CapacitorPlugin(
    name = "MusicLibrary",
    permissions = {
        @Permission(
            alias = "audio",
            strings = { Manifest.permission.READ_MEDIA_AUDIO }
        ),
        @Permission(
            alias = "legacyAudio",
            strings = { Manifest.permission.READ_EXTERNAL_STORAGE }
        )
    }
)
public class MusicLibraryPlugin extends Plugin {

    @PluginMethod
    public void requestAccess(PluginCall call) {
        String alias = Build.VERSION.SDK_INT >= 33
            ? "audio"
            : "legacyAudio";

        if (getPermissionState(alias) == PermissionState.GRANTED) {
            listSongs(call);
        } else {
            requestPermissionForAlias(
                alias,
                call,
                "permissionCallback"
            );
        }
    }

    @PermissionCallback
    private void permissionCallback(PluginCall call) {
        String alias = Build.VERSION.SDK_INT >= 33
            ? "audio"
            : "legacyAudio";

        if (getPermissionState(alias) == PermissionState.GRANTED) {
            listSongs(call);
        } else {
            call.reject("No se concedió el permiso para acceder a la música.");
        }
    }

    private void listSongs(PluginCall call) {
        JSArray songs = new JSArray();

        Uri collection = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI;

        String[] projection = {
            MediaStore.Audio.Media._ID,
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.ALBUM,
            MediaStore.Audio.Media.DURATION,
            MediaStore.Audio.Media.DISPLAY_NAME
        };

        String selection = MediaStore.Audio.Media.IS_MUSIC + " != 0";

        try (Cursor cursor = getContext()
            .getContentResolver()
            .query(collection, projection, selection, null,
                MediaStore.Audio.Media.TITLE + " ASC")) {

            if (cursor != null) {
                int idColumn = cursor.getColumnIndexOrThrow(
                    MediaStore.Audio.Media._ID
                );
                int titleColumn = cursor.getColumnIndexOrThrow(
                    MediaStore.Audio.Media.TITLE
                );
                int artistColumn = cursor.getColumnIndexOrThrow(
                    MediaStore.Audio.Media.ARTIST
                );
                int albumColumn = cursor.getColumnIndexOrThrow(
                    MediaStore.Audio.Media.ALBUM
                );
                int durationColumn = cursor.getColumnIndexOrThrow(
                    MediaStore.Audio.Media.DURATION
                );
                int nameColumn = cursor.getColumnIndexOrThrow(
                    MediaStore.Audio.Media.DISPLAY_NAME
                );

                while (cursor.moveToNext()) {
                    long id = cursor.getLong(idColumn);

                    Uri songUri = ContentUris.withAppendedId(
                        collection, id
                    );

                    JSObject song = new JSObject();
                    song.put("id", id);
                    song.put("title", cursor.getString(titleColumn));
                    song.put("artist", cursor.getString(artistColumn));
                    song.put("album", cursor.getString(albumColumn));
                    song.put("duration", cursor.getLong(durationColumn));
                    song.put("name", cursor.getString(nameColumn));
                    song.put("uri", songUri.toString());

                    songs.put(song);
                }
            }

            JSObject result = new JSObject();
            result.put("songs", songs);
            call.resolve(result);

        } catch (Exception error) {
            call.reject("No se pudo consultar la biblioteca musical.", error);
        }
    }
}