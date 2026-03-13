package com.aegisnote;

import android.os.Build;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;
import androidx.annotation.RequiresApi;
import java.security.KeyStore;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;

public class SecureKeyManager {
    private static final String KEY_ALIAS = "aegisnote_db_key";
    private static final int KEY_SIZE = 256;
    private static final SecureKeyManager instance = new SecureKeyManager();

    private final KeyStore keyStore;

    private SecureKeyManager() {
        try {
            keyStore = KeyStore.getInstance("AndroidKeyStore");
            keyStore.load(null);
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize KeyStore", e);
        }
    }

    @RequiresApi(api = Build.VERSION_CODES.M)
    public boolean generateAndStoreKey() {
        if (hasKey()) {
            return false;
        }

        try {
            KeyGenerator keyGenerator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES);
            keyGenerator.init(
                new KeyGenParameterSpec.Builder(
                    KEY_ALIAS,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
                )
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(KEY_SIZE)
                    .setUserAuthenticationRequired(false)
                    .setIsStrongBoxBacked(false)
                    .build()
            );
            keyGenerator.generateKey();
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String retrieveKey() {
        try {
            // Use get() instead of getEntry() - simpler approach
            java.security.Key key = keyStore.getKey(KEY_ALIAS, null);
            if (key != null) {
                android.util.Log.d("SecureKeyManager", "Key found, algorithm: " + key.getAlgorithm());
                byte[] encoded = key.getEncoded();
                if (encoded != null) {
                    String result = Base64.encodeToString(encoded, Base64.NO_WRAP);
                    android.util.Log.d("SecureKeyManager", "Retrieved key, encoded length: " + encoded.length);
                    return result;
                }
                android.util.Log.d("SecureKeyManager", "Key encoded is null");
                return null;
            }
            android.util.Log.d("SecureKeyManager", "Key not found in keystore");
            return null;
        } catch (Exception e) {
            android.util.Log.e("SecureKeyManager", "Error retrieving key: " + e.getMessage(), e);
            return null;
        }
    }

    public boolean hasKey() {
        try {
            boolean result = keyStore.entryInstanceOf(KEY_ALIAS, KeyStore.SecretKeyEntry.class);
            android.util.Log.d("SecureKeyManager", "hasKey: " + result);
            return result;
        } catch (Exception e) {
            android.util.Log.e("SecureKeyManager", "Error checking key: " + e.getMessage(), e);
            return false;
        }
    }

    public boolean deleteKey() {
        try {
            keyStore.deleteEntry(KEY_ALIAS);
            return true;
        } catch (Exception e) {
            return false;
        }
    }

    public String getKeyAlias() {
        return KEY_ALIAS;
    }

    public static SecureKeyManager getInstance() {
        return instance;
    }
}
