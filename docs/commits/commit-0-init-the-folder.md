# Creating the Folder Structure

Latest command:

```sh
$HOME/ryvo$ git commit -m "Init the folder structure."
[dev 97cd48d] Init the folder structure.
 233 files changed, 15186 insertions(+)
 create mode 100644 .gitignore
 create mode 100644 README.md
 create mode 100644 client/mobile/flutter/ryvo/.gitignore
 create mode 100644 client/mobile/flutter/ryvo/.metadata
 create mode 100644 client/mobile/flutter/ryvo/README.md
 create mode 100644 client/mobile/flutter/ryvo/analysis_options.yaml
 create mode 100644 client/mobile/flutter/ryvo/android/.gitignore
 create mode 100644 client/mobile/flutter/ryvo/android/app/build.gradle.kts
 create mode 100644 client/mobile/flutter/ryvo/android/app/src/debug/AndroidManifest.xml
 create mode 100644 client/mobile/flutter/ryvo/android/app/src/main/AndroidManifest.xml
 create mode 100644 client/mobile/flutter/ryvo/android/app/src/main/kotlin/com/example/ryvo/MainActivity.kt
 create mode 100644 client/mobile/flutter/ryvo/android/app/src/main/res/drawable-v21/launch_background.xml
 create mode 100644 client/mobile/flutter/ryvo/android/app/src/main/res/drawable/launch_background.xml
 create mode 100644 client/mobile/flutter/ryvo/android/app/src/main/res/mipmap-hdpi/ic_launcher.png
 create mode 100644 client/mobile/flutter/ryvo/android/app/src/main/res/mipmap-mdpi/ic_launcher.png
 create mode 100644 client/mobile/flutter/ryvo/android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
 create mode 100644 client/mobile/flutter/ryvo/android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
 create mode 100644 client/mobile/flutter/ryvo/android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
 create mode 100644 client/mobile/flutter/ryvo/android/app/src/main/res/values-night/styles.xml
 create mode 100644 client/mobile/flutter/ryvo/android/app/src/main/res/values/styles.xml
 create mode 100644 client/mobile/flutter/ryvo/android/app/src/profile/AndroidManifest.xml
 create mode 100644 client/mobile/flutter/ryvo/android/build.gradle.kts
 create mode 100644 client/mobile/flutter/ryvo/android/gradle.properties
 create mode 100644 client/mobile/flutter/ryvo/android/gradle/wrapper/gradle-wrapper.properties
 create mode 100644 client/mobile/flutter/ryvo/android/settings.gradle.kts
 create mode 100644 client/mobile/flutter/ryvo/ios/.gitignore
 create mode 100644 client/mobile/flutter/ryvo/ios/Flutter/AppFrameworkInfo.plist
 create mode 100644 client/mobile/flutter/ryvo/ios/Flutter/Debug.xcconfig
 create mode 100644 client/mobile/flutter/ryvo/ios/Flutter/Release.xcconfig
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner.xcodeproj/project.pbxproj
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner.xcodeproj/project.xcworkspace/contents.xcworkspacedata
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner.xcodeproj/project.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner.xcodeproj/project.xcworkspace/xcshareddata/WorkspaceSettings.xcsettings
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner.xcodeproj/xcshareddata/xcschemes/Runner.xcscheme
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner.xcworkspace/contents.xcworkspacedata
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner.xcworkspace/xcshareddata/WorkspaceSettings.xcsettings
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/AppDelegate.swift
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-1024x1024@1x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-20x20@1x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-20x20@2x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-20x20@3x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@1x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@2x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-29x29@3x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-40x40@1x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-40x40@2x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-40x40@3x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-60x60@2x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-60x60@3x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-76x76@1x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-76x76@2x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/AppIcon.appiconset/Icon-App-83.5x83.5@2x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/LaunchImage.imageset/Contents.json
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/LaunchImage.imageset/LaunchImage.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/LaunchImage.imageset/LaunchImage@2x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/LaunchImage.imageset/LaunchImage@3x.png
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Assets.xcassets/LaunchImage.imageset/README.md
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Base.lproj/LaunchScreen.storyboard
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Base.lproj/Main.storyboard
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Info.plist
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/Runner-Bridging-Header.h
 create mode 100644 client/mobile/flutter/ryvo/ios/Runner/SceneDelegate.swift
 create mode 100644 client/mobile/flutter/ryvo/ios/RunnerTests/RunnerTests.swift
 create mode 100644 client/mobile/flutter/ryvo/lib/main.dart
 create mode 100644 client/mobile/flutter/ryvo/linux/.gitignore
 create mode 100644 client/mobile/flutter/ryvo/linux/CMakeLists.txt
 create mode 100644 client/mobile/flutter/ryvo/linux/flutter/CMakeLists.txt
 create mode 100644 client/mobile/flutter/ryvo/linux/flutter/generated_plugin_registrant.cc
 create mode 100644 client/mobile/flutter/ryvo/linux/flutter/generated_plugin_registrant.h
 create mode 100644 client/mobile/flutter/ryvo/linux/flutter/generated_plugins.cmake
 create mode 100644 client/mobile/flutter/ryvo/linux/runner/CMakeLists.txt
 create mode 100644 client/mobile/flutter/ryvo/linux/runner/main.cc
 create mode 100644 client/mobile/flutter/ryvo/linux/runner/my_application.cc
 create mode 100644 client/mobile/flutter/ryvo/linux/runner/my_application.h
 create mode 100644 client/mobile/flutter/ryvo/macos/.gitignore
 create mode 100644 client/mobile/flutter/ryvo/macos/Flutter/Flutter-Debug.xcconfig
 create mode 100644 client/mobile/flutter/ryvo/macos/Flutter/Flutter-Release.xcconfig
 create mode 100644 client/mobile/flutter/ryvo/macos/Flutter/GeneratedPluginRegistrant.swift
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner.xcodeproj/project.pbxproj
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner.xcodeproj/project.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner.xcodeproj/xcshareddata/xcschemes/Runner.xcscheme
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner.xcworkspace/contents.xcworkspacedata
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner.xcworkspace/xcshareddata/IDEWorkspaceChecks.plist
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/AppDelegate.swift
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/Assets.xcassets/AppIcon.appiconset/Contents.json
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/Assets.xcassets/AppIcon.appiconset/app_icon_1024.png
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/Assets.xcassets/AppIcon.appiconset/app_icon_128.png
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/Assets.xcassets/AppIcon.appiconset/app_icon_16.png
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/Assets.xcassets/AppIcon.appiconset/app_icon_256.png
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/Assets.xcassets/AppIcon.appiconset/app_icon_32.png
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/Assets.xcassets/AppIcon.appiconset/app_icon_512.png
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/Assets.xcassets/AppIcon.appiconset/app_icon_64.png
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/Base.lproj/MainMenu.xib
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/Configs/AppInfo.xcconfig
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/Configs/Debug.xcconfig
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/Configs/Release.xcconfig
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/Configs/Warnings.xcconfig
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/DebugProfile.entitlements
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/Info.plist
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/MainFlutterWindow.swift
 create mode 100644 client/mobile/flutter/ryvo/macos/Runner/Release.entitlements
 create mode 100644 client/mobile/flutter/ryvo/macos/RunnerTests/RunnerTests.swift
 create mode 100644 client/mobile/flutter/ryvo/pubspec.lock
 create mode 100644 client/mobile/flutter/ryvo/pubspec.yaml
 create mode 100644 client/mobile/flutter/ryvo/test/widget_test.dart
 create mode 100644 client/mobile/flutter/ryvo/web/favicon.png
 create mode 100644 client/mobile/flutter/ryvo/web/icons/Icon-192.png
 create mode 100644 client/mobile/flutter/ryvo/web/icons/Icon-512.png
 create mode 100644 client/mobile/flutter/ryvo/web/icons/Icon-maskable-192.png
 create mode 100644 client/mobile/flutter/ryvo/web/icons/Icon-maskable-512.png
 create mode 100644 client/mobile/flutter/ryvo/web/index.html
 create mode 100644 client/mobile/flutter/ryvo/web/manifest.json
 create mode 100644 client/mobile/flutter/ryvo/windows/.gitignore
 create mode 100644 client/mobile/flutter/ryvo/windows/CMakeLists.txt
 create mode 100644 client/mobile/flutter/ryvo/windows/flutter/CMakeLists.txt
 create mode 100644 client/mobile/flutter/ryvo/windows/flutter/generated_plugin_registrant.cc
 create mode 100644 client/mobile/flutter/ryvo/windows/flutter/generated_plugin_registrant.h
 create mode 100644 client/mobile/flutter/ryvo/windows/flutter/generated_plugins.cmake
 create mode 100644 client/mobile/flutter/ryvo/windows/runner/CMakeLists.txt
 create mode 100644 client/mobile/flutter/ryvo/windows/runner/Runner.rc
 create mode 100644 client/mobile/flutter/ryvo/windows/runner/flutter_window.cpp
 create mode 100644 client/mobile/flutter/ryvo/windows/runner/flutter_window.h
 create mode 100644 client/mobile/flutter/ryvo/windows/runner/main.cpp
 create mode 100644 client/mobile/flutter/ryvo/windows/runner/resource.h
 create mode 100644 client/mobile/flutter/ryvo/windows/runner/resources/app_icon.ico
 create mode 100644 client/mobile/flutter/ryvo/windows/runner/runner.exe.manifest
 create mode 100644 client/mobile/flutter/ryvo/windows/runner/utils.cpp
 create mode 100644 client/mobile/flutter/ryvo/windows/runner/utils.h
 create mode 100644 client/mobile/flutter/ryvo/windows/runner/win32_window.cpp
 create mode 100644 client/mobile/flutter/ryvo/windows/runner/win32_window.h
 create mode 100644 client/web/ryvo/.dockerignore
 create mode 100644 client/web/ryvo/.env.example
 create mode 100644 client/web/ryvo/.eslintrc.js
 create mode 100644 client/web/ryvo/.gitignore
 create mode 100644 client/web/ryvo/.npmrc
 create mode 100644 client/web/ryvo/.prettierignore
 create mode 100644 client/web/ryvo/.prettierrc
 create mode 100644 client/web/ryvo/Dockerfile
 create mode 100644 client/web/ryvo/README.md
 create mode 100644 client/web/ryvo/apps/web/app/favicon.ico
 create mode 100644 client/web/ryvo/apps/web/app/layout.tsx
 create mode 100644 client/web/ryvo/apps/web/app/page.tsx
 create mode 100644 client/web/ryvo/apps/web/components.json
 create mode 100644 client/web/ryvo/apps/web/components/.gitkeep
 create mode 100644 client/web/ryvo/apps/web/components/theme-provider.tsx
 create mode 100644 client/web/ryvo/apps/web/eslint.config.js
 create mode 100644 client/web/ryvo/apps/web/hooks/.gitkeep
 create mode 100644 client/web/ryvo/apps/web/lib/.gitkeep
 create mode 100644 client/web/ryvo/apps/web/next-env.d.ts
 create mode 100644 client/web/ryvo/apps/web/next.config.mjs
 create mode 100644 client/web/ryvo/apps/web/package.json
 create mode 100644 client/web/ryvo/apps/web/postcss.config.mjs
 create mode 100644 client/web/ryvo/apps/web/tsconfig.json
 create mode 100644 client/web/ryvo/bun.lock
 create mode 100644 client/web/ryvo/package.json
 create mode 100644 client/web/ryvo/packages/eslint-config/README.md
 create mode 100644 client/web/ryvo/packages/eslint-config/base.js
 create mode 100644 client/web/ryvo/packages/eslint-config/next.js
 create mode 100644 client/web/ryvo/packages/eslint-config/package.json
 create mode 100644 client/web/ryvo/packages/eslint-config/react-internal.js
 create mode 100644 client/web/ryvo/packages/typescript-config/README.md
 create mode 100644 client/web/ryvo/packages/typescript-config/base.json
 create mode 100644 client/web/ryvo/packages/typescript-config/nextjs.json
 create mode 100644 client/web/ryvo/packages/typescript-config/package.json
 create mode 100644 client/web/ryvo/packages/typescript-config/react-library.json
 create mode 100644 client/web/ryvo/packages/ui/components.json
 create mode 100644 client/web/ryvo/packages/ui/eslint.config.js
 create mode 100644 client/web/ryvo/packages/ui/package.json
 create mode 100644 client/web/ryvo/packages/ui/postcss.config.mjs
 create mode 100644 client/web/ryvo/packages/ui/src/components/.gitkeep
 create mode 100644 client/web/ryvo/packages/ui/src/components/button.tsx
 create mode 100644 client/web/ryvo/packages/ui/src/hooks/.gitkeep
 create mode 100644 client/web/ryvo/packages/ui/src/lib/.gitkeep
 create mode 100644 client/web/ryvo/packages/ui/src/lib/utils.ts
 create mode 100644 client/web/ryvo/packages/ui/src/styles/globals.css
 create mode 100644 client/web/ryvo/packages/ui/tsconfig.json
 create mode 100644 client/web/ryvo/packages/ui/tsconfig.lint.json
 create mode 100644 client/web/ryvo/tsconfig.json
 create mode 100644 client/web/ryvo/turbo.json
 create mode 100644 docs/assets/images/google_maps_services.png
 create mode 100644 server/bunqueue/docker-compose.yaml
 create mode 100644 server/kafka/docker-compose.yml
 create mode 100644 server/redis/docker-compose.yml
 create mode 100644 server/supabase/CHANGELOG.md
 create mode 100644 server/supabase/README.md
 create mode 100644 server/supabase/dev/data.sql
 create mode 100644 server/supabase/dev/docker-compose.dev.yml
 create mode 100644 server/supabase/docker-compose.caddy.yml
 create mode 100644 server/supabase/docker-compose.envoy.yml
 create mode 100644 server/supabase/docker-compose.nginx.yml
 create mode 100644 server/supabase/docker-compose.pg17.yml
 create mode 100644 server/supabase/docker-compose.rustfs.yml
 create mode 100644 server/supabase/docker-compose.s3.yml
 create mode 100644 server/supabase/docker-compose.yml
 create mode 100755 server/supabase/reset.sh
 create mode 100644 server/supabase/tests/docker-compose.rustfs.test.yml
 create mode 100644 server/supabase/tests/docker-compose.s3.test.yml
 create mode 100644 server/supabase/tests/test-auth-keys.sh
 create mode 100644 server/supabase/tests/test-container-logs.sh
 create mode 100644 server/supabase/tests/test-pg17-upgrade.sh
 create mode 100644 server/supabase/tests/test-s3-backend.sh
 create mode 100644 server/supabase/tests/test-s3.sh
 create mode 100644 server/supabase/tests/test-self-hosted.sh
 create mode 100644 server/supabase/utils/add-new-auth-keys.sh
 create mode 100644 server/supabase/utils/db-passwd.sh
 create mode 100644 server/supabase/utils/generate-keys.sh
 create mode 100644 server/supabase/utils/reassign-owner.sh
 create mode 100644 server/supabase/utils/rotate-new-api-keys.sh
 create mode 100644 server/supabase/utils/upgrade-pg17.sh
 create mode 100644 server/supabase/versions.md
 create mode 100644 server/supabase/volumes/api/envoy/cds.yaml
 create mode 100755 server/supabase/volumes/api/envoy/docker-entrypoint.sh
 create mode 100644 server/supabase/volumes/api/envoy/envoy.yaml
 create mode 100644 server/supabase/volumes/api/envoy/lds.template.yaml
 create mode 100755 server/supabase/volumes/api/kong-entrypoint.sh
 create mode 100644 server/supabase/volumes/api/kong.yml
 create mode 100644 server/supabase/volumes/db/_supabase.sql
 create mode 100755 server/supabase/volumes/db/init/data.sql
 create mode 100644 server/supabase/volumes/db/jwt.sql
 create mode 100644 server/supabase/volumes/db/logs.sql
 create mode 100644 server/supabase/volumes/db/pooler.sql
 create mode 100644 server/supabase/volumes/db/realtime.sql
 create mode 100644 server/supabase/volumes/db/roles.sql
 create mode 100644 server/supabase/volumes/db/webhooks.sql
 create mode 100644 server/supabase/volumes/functions/hello/index.ts
 create mode 100644 server/supabase/volumes/functions/main/index.ts
 create mode 100644 server/supabase/volumes/logs/vector.yml
 create mode 100644 server/supabase/volumes/pooler/pooler.exs
 create mode 100644 server/supabase/volumes/proxy/caddy/Caddyfile
 create mode 100644 server/supabase/volumes/proxy/nginx/supabase-nginx.conf.tpl
 create mode 100644 server/supabase/volumes/snippets/.gitkeep
 iautec@IAUTEC-1:~/Projects/Web/Ryvo/ryvo$ git status
On branch dev
Untracked files:
  (use "git add <file>..." to include in what will be committed)
        analytics/
        docs/commits/

nothing added to commit but untracked files present (use "git add" to track)
iautec@IAUTEC-1:~/Projects/Web/Ryvo/ryvo$ git add .
iautec@IAUTEC-1:~/Projects/Web/Ryvo/ryvo$ git commit -m "Added remaining files for boilerplate."
[dev 8609bd9] Added remaining files for boilerplate.
 2 files changed, 242 insertions(+)
 create mode 100644 analytics/prometeus_grafana/docker-compose.yml
 create mode 100644 docs/commits/commit-0-init-the-folder.md
iautec@IAUTEC-1:~/Projects/Web/Ryvo/ryvo$ git push origin dev
Enumerating objects: 322, done.
Counting objects: 100% (322/322), done.
Delta compression using up to 24 threads
Compressing objects: 100% (270/270), done.
Writing objects: 100% (321/321), 553.26 KiB | 23.05 MiB/s, done.
Total 321 (delta 28), reused 0 (delta 0), pack-reused 0 (from 0)
remote: Resolving deltas: 100% (28/28), done.
remote: 
remote: Create a pull request for 'dev' on GitHub by visiting:
remote:      https://github.com/coorise/ryvo/pull/new/dev
remote: 
To https://github.com/coorise/ryvo.git
 * [new branch]      dev -> dev
```