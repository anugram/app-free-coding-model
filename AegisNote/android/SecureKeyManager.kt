// package com.aegisnote

import android.os.Build
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import androidx.annotation.RequiresApi
import java.security.KeyStore
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey

class SecureKeyManager {
    companion object {
        @JvmStatic
        val instance = SecureKeyManager()
        private const val KEY_ALIAS = "aegisnote_db_key"
        private const val KEY_SIZE = 256
    }

    private val keyStore by lazy {
        KeyStore.getInstance("AndroidKeyStore").apply {
            load(null)
        }
    }

    @RequiresApi(Build.VERSION_CODES.M)
    fun generateAndStoreKey(): Boolean {
        if (hasKey()) {
            return false
        }

        return try {
            val keyGenerator = KeyGenerator.getInstance(
                KeyProperties.KEY_ALGORITHM_AES
            ).apply {
                init(
                    KeyGenParameterSpec.Builder(
                        KEY_ALIAS,
                        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
                    )
                        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                        .setKeySize(KEY_SIZE)
                        .setUserAuthenticationRequired(false)
                        .setIsStrongBoxBacked(true) // Requires hardware-backed security
                        .build()
                )
            }

            keyGenerator.generateKey()
            true
        } catch (e: Exception) {
            false
        }
    }

    fun retrieveKey(): String? {
        return try {
            val entry = keyStore.getEntry(KEY_ALIAS, null)
            if (entry is KeyStore.SecretKeyEntry) {
                val secretKey = entry.secretKey
                secretKey.encoded?.let { Base64.encodeToString(it, Base64.NO_WRAP) }
            } else {
                null
            }
        } catch (e: Exception) {
            null
        }
    }

    fun hasKey(): Boolean {
        return try {
            keyStore.entryInstanceOf(KEY_ALIAS, KeyStore.SecretKeyEntry::class.java)
        } catch (e: Exception) {
            false
        }
    }

    fun deleteKey(): Boolean {
        return try {
            keyStore.deleteEntry(KEY_ALIAS)
            true
        } catch (e: Exception) {
            false
        }
    }

    fun getKeyAlias(): String {
        return KEY_ALIAS
    }
}
