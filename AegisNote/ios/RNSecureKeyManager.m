//
//  RNSecureKeyManager.m
//  AegisNote
//
//  React Native bridge for Secure Key Manager iOS implementation.
//

#import <React/RCTLog.h>
#import <React/RCTBridgeModule.h>
#import "SecureKeyManager.h"

@interface RNSecureKeyManager : NSObject <RCTBridgeModule>
@end

@implementation RNSecureKeyManager

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(generateAndStoreKey:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        BOOL success = [[SecureKeyManager shared] generateAndStoreKey];
        resolve(@[success]);
    });
}

RCT_EXPORT_METHOD(retrieveKey:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        NSString *key = [[SecureKeyManager shared] retrieveKey];
        resolve(key);
    });
}

RCT_EXPORT_METHOD(hasKey:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        BOOL hasKey = [[SecureKeyManager shared] hasKey];
        resolve(@[hasKey]);
    });
}

RCT_EXPORT_METHOD(deleteKey:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        BOOL success = [[SecureKeyManager shared] deleteKey];
        resolve(@[success]);
    });
}

RCT_EXPORT_METHOD(getKeyAlias:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)
{
    dispatch_async(dispatch_get_main_queue(), ^{
        NSString *alias = [[SecureKeyManager shared] getKeyAlias];
        resolve(alias);
    });
}

@end
