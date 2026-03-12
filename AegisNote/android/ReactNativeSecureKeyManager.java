package com.aegisnote;

import android.os.Build;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import com.facebook.react.bridge.*;
import com.facebook.react.modules.core.DeviceEventManagerModule;

public class ReactNativeSecureKeyManager extends ReactContextBaseJavaModule {

    private final ReactContext mReactContext;
    private final SecureKeyManager mSecureKeyManager;

    public ReactNativeSecureKeyManager(ReactContext reactContext) {
        super(reactContext);
        this.mReactContext = reactContext;
        this.mSecureKeyManager = SecureKeyManager.instance;
    }

    @NonNull
    @Override
    public String getName() {
        return "RNSecureKeyManager";
    }

    @ReactMethod
    public void generateAndStoreKey(Promise promise) {
        try {
            boolean result;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                result = mSecureKeyManager.generateAndStoreKey();
            } else {
                // Fallback for older Android versions
                result = false;
            }
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("GENERATE_KEY_ERROR", e);
        }
    }

    @ReactMethod
    public void retrieveKey(Promise promise) {
        try {
            String key = mSecureKeyManager.retrieveKey();
            promise.resolve(key);
        } catch (Exception e) {
            promise.reject("RETRIEVE_KEY_ERROR", e);
        }
    }

    @ReactMethod
    public void hasKey(Promise promise) {
        try {
            boolean result = mSecureKeyManager.hasKey();
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("HAS_KEY_ERROR", e);
        }
    }

    @ReactMethod
    public void deleteKey(Promise promise) {
        try {
            boolean result = mSecureKeyManager.deleteKey();
            promise.resolve(result);
        } catch (Exception e) {
            promise.reject("DELETE_KEY_ERROR", e);
        }
    }

    @ReactMethod
    public void getKeyAlias(Promise promise) {
        try {
            String alias = mSecureKeyManager.getKeyAlias();
            promise.resolve(alias);
        } catch (Exception e) {
            promise.reject("GET_ALIAS_ERROR", e);
        }
    }
}
