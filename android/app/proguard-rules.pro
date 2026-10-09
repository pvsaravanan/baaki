# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# Capacitor's own keep rules cover plugin subclasses but not what the bridge
# reads from them at runtime. Keep the base class, whose methods JS calls by
# name (checkPermissions, requestPermissions, addListener for the back button),
# and the plugin annotations with their values: R8's full mode otherwise drops
# @CapacitorPlugin(permissions = …), and the permission request finds nothing.
-keepattributes RuntimeVisibleAnnotations,AnnotationDefault
-keep @interface com.getcapacitor.annotation.** { *; }
-keep class com.getcapacitor.Plugin { *; }
