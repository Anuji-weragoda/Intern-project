// Flutter web plugin registrant file.
//
// Generated file. Do not edit.
//

// @dart = 2.13
// ignore_for_file: type=lint

import 'package:amplify_secure_storage/src/amplify_secure_storage.web.dart';
import 'package:device_info_plus/src/device_info_plus_web.dart';
import 'package:flutter_secure_storage_web/flutter_secure_storage_web.dart';
import 'package:package_info_plus/src/package_info_plus_web.dart';
import 'package:flutter_web_plugins/flutter_web_plugins.dart';

void registerPlugins([final Registrar? pluginRegistrar]) {
  final Registrar registrar = pluginRegistrar ?? webPluginRegistrar;
  AmplifySecureStorage.registerWith(registrar);
  DeviceInfoPlusWebPlugin.registerWith(registrar);
  FlutterSecureStorageWeb.registerWith(registrar);
  PackageInfoPlusWebPlugin.registerWith(registrar);
  registrar.registerMessageHandler();
}
