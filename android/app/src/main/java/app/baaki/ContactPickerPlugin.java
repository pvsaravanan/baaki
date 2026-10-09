package app.baaki;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract;
import android.util.Base64;

import androidx.activity.result.ActivityResult;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/**
 * Picks one person from the phone's contacts with Android's own picker, for
 * their name and photo. Reading the photo needs READ_CONTACTS (the picker only
 * lends the contact itself), asked for from JS as the "contacts" alias. baaki
 * never writes to the address book, so it doesn't ask for WRITE_CONTACTS.
 */
@CapacitorPlugin(
    name = "ContactPicker",
    permissions = { @Permission(strings = { Manifest.permission.READ_CONTACTS }, alias = "contacts") }
)
public class ContactPickerPlugin extends Plugin {

    @PluginMethod
    public void pick(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_PICK, ContactsContract.Contacts.CONTENT_URI);
        startActivityForResult(call, intent, "picked");
    }

    /** Resolves { name, photo } (photo: base64 JPEG/PNG), or {} if the person backed out. */
    @ActivityCallback
    private void picked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Uri contact = result.getData() == null ? null : result.getData().getData();
        if (result.getResultCode() != Activity.RESULT_OK || contact == null) {
            call.resolve(new JSObject());
            return;
        }
        ContentResolver resolver = getContext().getContentResolver();
        JSObject picked = new JSObject();
        try (Cursor row = resolver.query(contact, new String[] { ContactsContract.Contacts.DISPLAY_NAME }, null, null, null)) {
            if (row != null && row.moveToFirst()) picked.put("name", row.getString(0));
        } catch (SecurityException e) {
            call.reject("Couldn't read that contact.");
            return;
        }
        // The photo is a nicety: a contact without one still gives a name.
        try (InputStream photo = ContactsContract.Contacts.openContactPhotoInputStream(resolver, contact, false)) {
            if (photo != null) picked.put("photo", Base64.encodeToString(readAll(photo), Base64.NO_WRAP));
        } catch (Exception ignored) {
        }
        call.resolve(picked);
    }

    private static byte[] readAll(InputStream in) throws java.io.IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        for (int n; (n = in.read(buffer)) != -1; ) out.write(buffer, 0, n);
        return out.toByteArray();
    }
}
