const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('====================================================');
console.log('  COMPILACIÓN APK 100% NATIVO, INDEPENDIENTE Y OFFLINE');
console.log('====================================================');

const ROOT_DIR = 'C:/Users/AUTONOMA/Documents/GESTION DE ACTAS';
const BUILD_DIR = path.join(ROOT_DIR, 'scripts/android_build');
const TOOLS_DIR = 'C:/Users/AUTONOMA/.gemini/antigravity-ide/brain/f711cff4-2ad9-44ad-82f7-82267d10edab/scratch/android_tools';
const KEYSTORE = 'C:/Users/AUTONOMA/.gemini/antigravity-ide/brain/f711cff4-2ad9-44ad-82f7-82267d10edab/scratch/extracted_cloud/signing.keystore';
const OUTPUT_APK = path.join(ROOT_DIR, 'downloads/APPTAS.apk');
const DOWNLOADS_COPY = 'C:/Users/AUTONOMA/Downloads/APPTAS.apk';

const AAPT2 = path.join(TOOLS_DIR, 'aapt2.exe');
const ANDROID_JAR = path.join(TOOLS_DIR, 'android.jar');
const R8_JAR = path.join(TOOLS_DIR, 'r8.jar');
const UBER_SIGNER = path.join(TOOLS_DIR, 'uber-apk-signer.jar');
const JAVAC = 'C:/Program Files/Java/jdk-26.0.2.1/bin/javac.exe';
const JAR = 'C:/Program Files/Java/jdk-26.0.2.1/bin/jar.exe';

// 1. Limpiar y recrear estructura de carpetas
if (fs.existsSync(BUILD_DIR)) {
  fs.rmSync(BUILD_DIR, { recursive: true, force: true });
}
fs.mkdirSync(BUILD_DIR, { recursive: true });

const assetsDir = path.join(BUILD_DIR, 'assets');
const resDir = path.join(BUILD_DIR, 'res');
const srcDir = path.join(BUILD_DIR, 'src/pe/autonoma/actasdti');
const genDir = path.join(BUILD_DIR, 'gen');
const binDir = path.join(BUILD_DIR, 'bin');
const dexDir = path.join(BUILD_DIR, 'dex');
const outDir = path.join(BUILD_DIR, 'signed_out');

[assetsDir, resDir, srcDir, genDir, binDir, dexDir, outDir].forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

// Función recursiva para copiar directorios
function copyFolderSync(from, to) {
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });
  fs.readdirSync(from).forEach(element => {
    const stat = fs.lstatSync(path.join(from, element));
    if (stat.isDirectory()) {
      copyFolderSync(path.join(from, element), path.join(to, element));
    } else {
      fs.copyFileSync(path.join(from, element), path.join(to, element));
    }
  });
}

// 2. Copiar todos los archivos web a assets/ para funcionamiento 100% offline
console.log('1. Copiando archivos de la aplicación a assets/...');
fs.copyFileSync(path.join(ROOT_DIR, 'index.html'), path.join(assetsDir, 'index.html'));
fs.copyFileSync(path.join(ROOT_DIR, 'favicon.png'), path.join(assetsDir, 'favicon.png'));
if (fs.existsSync(path.join(ROOT_DIR, 'google_apps_script.js'))) {
  fs.copyFileSync(path.join(ROOT_DIR, 'google_apps_script.js'), path.join(assetsDir, 'google_apps_script.js'));
}
if (fs.existsSync(path.join(ROOT_DIR, 'config.json'))) {
  fs.copyFileSync(path.join(ROOT_DIR, 'config.json'), path.join(assetsDir, 'config.json'));
}
copyFolderSync(path.join(ROOT_DIR, 'css'), path.join(assetsDir, 'css'));
copyFolderSync(path.join(ROOT_DIR, 'js'), path.join(assetsDir, 'js'));
copyFolderSync(path.join(ROOT_DIR, 'brand'), path.join(assetsDir, 'brand'));

console.log('   Archivos web empaquetados en assets/ con éxito.');

// 3. Copiar recursos nativos Android (iconos mipmap y estilos)
console.log('2. Configurando recursos visuales nativos...');
const sourceRes = 'C:/Users/AUTONOMA/.gemini/antigravity-ide/brain/f711cff4-2ad9-44ad-82f7-82267d10edab/scratch/native_apk_project/res';
copyFolderSync(sourceRes, resDir);

// Reemplazar strings.xml y styles.xml limpios con nombre oficial APPTAS
fs.writeFileSync(path.join(resDir, 'values/strings.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">APPTAS</string>
</resources>
`, 'utf8');

fs.writeFileSync(path.join(resDir, 'values/styles.xml'), `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme" parent="@android:style/Theme.DeviceDefault.Light.NoActionBar">
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowActionBar">false</item>
        <item name="android:statusBarColor">@android:color/white</item>
        <item name="android:windowLightStatusBar">true</item>
        <item name="android:navigationBarColor">@android:color/white</item>
    </style>
</resources>
`, 'utf8');

// 4. AndroidManifest.xml optimizado
console.log('3. Generando AndroidManifest.xml...');
const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="pe.autonoma.actasdti"
    android:versionCode="9"
    android:versionName="9.0.0">

    <uses-sdk
        android:minSdkVersion="21"
        android:targetSdkVersion="28" />

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="28" />

    <supports-screens
        android:anyDensity="true"
        android:smallScreens="true"
        android:normalScreens="true"
        android:largeScreens="true"
        android:xlargeScreens="true" />

    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true"
        android:hardwareAccelerated="true"
        android:allowBackup="true"
        android:supportsRtl="true">

        <activity
            android:name="pe.autonoma.actasdti.MainActivity"
            android:exported="true"
            android:configChanges="orientation|screenSize|screenLayout|keyboardHidden"
            android:windowSoftInputMode="adjustResize"
            android:theme="@style/AppTheme">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
`;
fs.writeFileSync(path.join(BUILD_DIR, 'AndroidManifest.xml'), manifestContent, 'utf8');

// 5. MainActivity.java Nativo con AndroidBridge y carga local
console.log('4. Generando código fuente Java nativo...');
const mainActivityJava = `package pe.autonoma.actasdti;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.media.MediaScannerConnection;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.StrictMode;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.Toast;
import android.content.Context;
import android.content.ContentValues;
import android.provider.MediaStore;
import android.print.PrintManager;
import android.print.PrintDocumentAdapter;
import android.print.PrintAttributes;
import java.io.OutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;

public class MainActivity extends Activity {
    private WebView webView;
    private LinearLayout splashView;

    public class AndroidBridge {
        @JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @JavascriptInterface
        public void print() {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        PrintManager printManager = (PrintManager) MainActivity.this.getSystemService(Context.PRINT_SERVICE);
                        if (printManager != null && webView != null) {
                            String jobName = "Acta_Oficial_Autonoma_" + System.currentTimeMillis();
                            PrintDocumentAdapter printAdapter = webView.createPrintDocumentAdapter(jobName);
                            printManager.print(jobName, printAdapter, new PrintAttributes.Builder().build());
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                        Toast.makeText(MainActivity.this, "Error al abrir servicio de impresión: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                    }
                }
            });
        }

        @JavascriptInterface
        public void savePdf(final String base64Data, final String filename) {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        byte[] pdfBytes = Base64.decode(base64Data, Base64.DEFAULT);
                        boolean saved = false;

                        // Estrategia 1: MediaStore (Android 10+ / API 29+)
                        // Guarda DIRECTAMENTE en la carpeta pública Descargas del sistema sin requerir permisos
                        if (Build.VERSION.SDK_INT >= 29) {
                            try {
                                ContentValues values = new ContentValues();
                                values.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                                values.put(MediaStore.MediaColumns.MIME_TYPE, "application/pdf");
                                values.put("relative_path", Environment.DIRECTORY_DOWNLOADS);
                                Uri downloadUri = Uri.parse("content://media/external/downloads");
                                Uri itemUri = getContentResolver().insert(downloadUri, values);
                                if (itemUri != null) {
                                    OutputStream os = getContentResolver().openOutputStream(itemUri);
                                    if (os != null) {
                                        os.write(pdfBytes);
                                        os.flush();
                                        os.close();
                                        saved = true;
                                    }
                                }
                            } catch (Throwable tMedia) {
                                tMedia.printStackTrace();
                            }
                        }

                        // Estrategia 2: Carpeta pública Download (Android 9 y anteriores o fallback)
                        if (!saved) {
                            try {
                                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                                if (!downloadsDir.exists()) downloadsDir.mkdirs();
                                File targetFile = new File(downloadsDir, filename);
                                FileOutputStream fos = new FileOutputStream(targetFile);
                                fos.write(pdfBytes);
                                fos.flush();
                                fos.close();
                                if (targetFile.exists() && targetFile.length() > 0) {
                                    saved = true;
                                    MediaScannerConnection.scanFile(
                                        MainActivity.this,
                                        new String[]{targetFile.getAbsolutePath()},
                                        new String[]{"application/pdf"},
                                        null
                                    );
                                }
                            } catch (Throwable tPub) {
                                tPub.printStackTrace();
                            }
                        }

                        // Estrategia 3: Fallback en directorio externo accesible
                        if (!saved) {
                            try {
                                File extDir = getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
                                if (extDir == null) extDir = getFilesDir();
                                File targetFile = new File(extDir, filename);
                                FileOutputStream fos = new FileOutputStream(targetFile);
                                fos.write(pdfBytes);
                                fos.flush();
                                fos.close();
                                if (targetFile.exists() && targetFile.length() > 0) {
                                    saved = true;
                                    MediaScannerConnection.scanFile(
                                        MainActivity.this,
                                        new String[]{targetFile.getAbsolutePath()},
                                        new String[]{"application/pdf"},
                                        null
                                    );
                                }
                            } catch (Throwable tPriv) {
                                tPriv.printStackTrace();
                            }
                        }

                        if (saved) {
                            runOnUiThread(new Runnable() {
                                @Override
                                public void run() {
                                    Toast.makeText(MainActivity.this, "✅ PDF descargado en Descargas: " + filename, Toast.LENGTH_LONG).show();
                                }
                            });
                        } else {
                            throw new Exception("No se pudo escribir el archivo PDF en Descargas.");
                        }
                    } catch (final Exception e) {
                        e.printStackTrace();
                        runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                Toast.makeText(MainActivity.this, "Error al descargar PDF: " + e.getMessage(), Toast.LENGTH_LONG).show();
                            }
                        });
                    }
                }
            }).start();
        }

        @JavascriptInterface
        public String getDriveConfig() {
            SharedPreferences sp = getSharedPreferences("ua_actas_config", MODE_PRIVATE);
            String url = sp.getString("webhook_url", "");
            String safeUrl = (url != null) ? url.trim() : "";
            return "{\\"webhookUrl\\":\\"" + safeUrl + "\\"}";
        }

        @JavascriptInterface
        public void saveDriveConfig(String url) {
            SharedPreferences sp = getSharedPreferences("ua_actas_config", MODE_PRIVATE);
            sp.edit().putString("webhook_url", url).apply();
        }

        @JavascriptInterface
        public String getActas() {
            try {
                File f = new File(getFilesDir(), "actas_db.json");
                if (!f.exists()) return "[]";
                FileInputStream fis = new FileInputStream(f);
                byte[] buf = new byte[(int) f.length()];
                fis.read(buf);
                fis.close();
                return new String(buf, "UTF-8");
            } catch (Exception e) {
                return "[]";
            }
        }

        @JavascriptInterface
        public void saveActa(String jsonItem) {
            try {
                File f = new File(getFilesDir(), "actas_db.json");
                String existing = "[]";
                if (f.exists()) {
                    FileInputStream fis = new FileInputStream(f);
                    byte[] buf = new byte[(int) f.length()];
                    fis.read(buf);
                    fis.close();
                    existing = new String(buf, "UTF-8");
                }
                String updated;
                if (existing.trim().startsWith("[")) {
                    if (existing.trim().equals("[]")) {
                        updated = "[" + jsonItem + "]";
                    } else {
                        updated = "[" + jsonItem + "," + existing.trim().substring(1);
                    }
                } else {
                    updated = "[" + jsonItem + "]";
                }
                FileOutputStream fos = new FileOutputStream(f);
                fos.write(updated.getBytes("UTF-8"));
                fos.flush();
                fos.close();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }

        @JavascriptInterface
        public void downloadApkDirect() {
            new Thread(new Runnable() {
                @Override
                public void run() {
                    try {
                        String myApkPath = getPackageCodePath();
                        File srcFile = new File(myApkPath);
                        if (srcFile.exists()) {
                            byte[] buffer = new byte[8192];
                            int length;
                            boolean apkSaved = false;

                            // MediaStore (Android 10+ / API 29+)
                            if (Build.VERSION.SDK_INT >= 29) {
                                try {
                                    ContentValues values = new ContentValues();
                                    values.put(MediaStore.MediaColumns.DISPLAY_NAME, "APPTAS.apk");
                                    values.put(MediaStore.MediaColumns.MIME_TYPE, "application/vnd.android.package-archive");
                                    values.put("relative_path", Environment.DIRECTORY_DOWNLOADS);
                                    Uri downloadUri = Uri.parse("content://media/external/downloads");
                                    Uri itemUri = getContentResolver().insert(downloadUri, values);
                                    if (itemUri != null) {
                                        OutputStream os = getContentResolver().openOutputStream(itemUri);
                                        FileInputStream is = new FileInputStream(srcFile);
                                        while ((length = is.read(buffer)) > 0) {
                                            os.write(buffer, 0, length);
                                        }
                                        is.close();
                                        os.flush();
                                        os.close();
                                        apkSaved = true;
                                    }
                                } catch (Throwable tMedia) {
                                    tMedia.printStackTrace();
                                }
                            }

                            if (!apkSaved) {
                                File downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                                if (!downloadsDir.exists()) downloadsDir.mkdirs();
                                File targetFile = new File(downloadsDir, "APPTAS.apk");
                                FileInputStream inStream = new FileInputStream(srcFile);
                                FileOutputStream outStream = new FileOutputStream(targetFile);
                                while ((length = inStream.read(buffer)) > 0) {
                                    outStream.write(buffer, 0, length);
                                }
                                inStream.close();
                                outStream.flush();
                                outStream.close();

                                MediaScannerConnection.scanFile(
                                    MainActivity.this,
                                    new String[]{targetFile.getAbsolutePath()},
                                    new String[]{"application/vnd.android.package-archive"},
                                    null
                                );
                                apkSaved = true;
                            }

                            if (apkSaved) {
                                runOnUiThread(new Runnable() {
                                    @Override
                                    public void run() {
                                        Toast.makeText(MainActivity.this, "✅ APPTAS.apk guardado en Descargas", Toast.LENGTH_LONG).show();
                                    }
                                });
                                return;
                            }
                        }
                    } catch (Exception e) {
                        e.printStackTrace();
                    }

                    runOnUiThread(new Runnable() {
                        @Override
                        public void run() {
                            try {
                                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://spoo.me/apptasfinal"));
                                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(intent);
                            } catch (Exception ex) {}
                        }
                    });
                }
            }).start();
        }

        @JavascriptInterface
        public void openUrl(final String url) {
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        startActivity(intent);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                }
            });
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Sin solicitud intrusiva de permisos: Android 10+ usa MediaStore nativo directo a Descargas

        try {
            StrictMode.VmPolicy.Builder builder = new StrictMode.VmPolicy.Builder();
            StrictMode.setVmPolicy(builder.build());
        } catch (Throwable t) {}

        try {
            Window window = getWindow();
            if (window != null) {
                window.addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS);
                window.clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS);
                window.setStatusBarColor(Color.WHITE);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    window.getDecorView().setSystemUiVisibility(
                        View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                    );
                }
            }
        } catch (Throwable t) {}

        FrameLayout rootLayout = new FrameLayout(this);
        rootLayout.setBackgroundColor(Color.WHITE);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.WHITE);

        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setAllowFileAccess(true);
        ws.setAllowContentAccess(true);
        ws.setAllowFileAccessFromFileURLs(true);
        ws.setAllowUniversalAccessFromFileURLs(true);
        ws.setLoadsImagesAutomatically(true);
        ws.setUseWideViewPort(true);
        ws.setLoadWithOverviewMode(true);
        ws.setSupportZoom(false);
        ws.setBuiltInZoomControls(false);
        ws.setDisplayZoomControls(false);

        // Registrar puente nativo
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        // Diálogos nativos con título oficial
        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onJsAlert(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Actas Autónoma")
                    .setMessage(message)
                    .setPositiveButton("Entendido", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            result.confirm();
                        }
                    })
                    .setCancelable(false)
                    .show();
                return true;
            }

            @Override
            public boolean onJsConfirm(WebView view, String url, String message, final JsResult result) {
                new AlertDialog.Builder(MainActivity.this)
                    .setTitle("Actas Autónoma")
                    .setMessage(message)
                    .setPositiveButton("Aceptar", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            result.confirm();
                        }
                    })
                    .setNegativeButton("Cancelar", new DialogInterface.OnClickListener() {
                        @Override
                        public void onClick(DialogInterface dialog, int which) {
                            result.cancel();
                        }
                    })
                    .setCancelable(false)
                    .show();
                return true;
            }
        });

        webView.setDownloadListener(new android.webkit.DownloadListener() {
            @Override
            public void onDownloadStart(String url, String userAgent, String contentDisposition, String mimetype, long contentLength) {
                try {
                    Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(i);
                } catch (Exception e) {
                    e.printStackTrace();
                }
            }
        });

        // Splash Screen Oficial Universidad Autónoma
        splashView = new LinearLayout(this);
        splashView.setOrientation(LinearLayout.VERTICAL);
        splashView.setGravity(Gravity.CENTER);
        splashView.setBackgroundColor(Color.WHITE);

        ImageView splashLogo = new ImageView(this);
        splashLogo.setImageResource(R.drawable.splash_logo);
        splashLogo.setAdjustViewBounds(true);
        int logoWidth = (int) (270 * getResources().getDisplayMetrics().density);
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(logoWidth, LinearLayout.LayoutParams.WRAP_CONTENT);
        splashLogo.setLayoutParams(lp);
        splashView.addView(splashLogo);

        ProgressBar progressBar = new ProgressBar(this);
        LinearLayout.LayoutParams pbLp = new LinearLayout.LayoutParams(
            (int) (38 * getResources().getDisplayMetrics().density),
            (int) (38 * getResources().getDisplayMetrics().density)
        );
        pbLp.topMargin = (int) (24 * getResources().getDisplayMetrics().density);
        progressBar.setLayoutParams(pbLp);
        splashView.addView(progressBar);

        final long startTime = System.currentTimeMillis();
        final long MIN_SPLASH_TIME = 1500;

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url.startsWith("file:///android_asset/")) {
                    return false;
                }
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    startActivity(intent);
                    return true;
                } catch (Exception e) {
                    return false;
                }
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                long elapsed = System.currentTimeMillis() - startTime;
                long delay = Math.max(0, MIN_SPLASH_TIME - elapsed);
                new android.os.Handler().postDelayed(new Runnable() {
                    @Override
                    public void run() {
                        if (splashView != null && splashView.getVisibility() == View.VISIBLE) {
                            splashView.animate()
                                .alpha(0.0f)
                                .setDuration(350)
                                .withEndAction(new Runnable() {
                                    @Override
                                    public void run() {
                                        splashView.setVisibility(View.GONE);
                                    }
                                });
                        }
                    }
                }, delay);
            }
        });

        rootLayout.addView(webView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        rootLayout.addView(splashView, new FrameLayout.LayoutParams(
            FrameLayout.LayoutParams.MATCH_PARENT,
            FrameLayout.LayoutParams.MATCH_PARENT
        ));

        setContentView(rootLayout);

        // CARGA LOCAL 100% STANDALONE (SIN DEPENDER DE SERVIDOR WEB NI TÚNELES)
        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
`;
fs.writeFileSync(path.join(srcDir, 'MainActivity.java'), mainActivityJava, 'utf8');

// 6. Paso 1: Compilar recursos con aapt2
console.log('5. Compilando recursos con AAPT2...');
const resZip = path.join(BUILD_DIR, 'compiled_res.zip');
execSync(`"${AAPT2}" compile --dir "${resDir}" -o "${resZip}"`, { stdio: 'inherit' });

// 7. Paso 2: Vincular APK base (recursos compilados + manifest)
console.log('6. Vinculando APK base...');
const unsignedApk = path.join(BUILD_DIR, 'base_unsigned.apk');
execSync(`"${AAPT2}" link -o "${unsignedApk}" -I "${ANDROID_JAR}" "${resZip}" --manifest "${path.join(BUILD_DIR, 'AndroidManifest.xml')}" --java "${genDir}" --auto-add-overlay --min-sdk-version 21 --target-sdk-version 28 --compile-sdk-version-code 28 --compile-sdk-version-name 9`, { stdio: 'inherit' });

// 8. Paso 3: Compilar Java con javac
console.log('7. Compilando código Java con Javac...');
execSync(`"${JAVAC}" --release 8 -cp "${ANDROID_JAR}" -d "${binDir}" "${path.join(genDir, 'pe/autonoma/actasdti/R.java')}" "${path.join(srcDir, 'MainActivity.java')}"`, { stdio: 'inherit' });

// 9. Paso 4: D8 / R8 a dex
console.log('8. Convirtiendo bytecode a DEX con D8...');
const classFiles = [];
function findClassFiles(dir) {
  fs.readdirSync(dir).forEach(f => {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) findClassFiles(full);
    else if (full.endsWith('.class')) classFiles.push(`"${full}"`);
  });
}
findClassFiles(binDir);

execSync(`java -cp "${R8_JAR}" com.android.tools.r8.D8 --lib "${ANDROID_JAR}" --output "${dexDir}" ${classFiles.join(' ')}`, { stdio: 'inherit' });

// 10. Paso 5: Empaquetar classes.dex y assets/ con separadores estándar (/) para compatibilidad Android
console.log('9. Integrando classes.dex y assets/ en el archivo APK con formato estándar...');
execSync(`"${JAR}" uf "${unsignedApk}" -C "${dexDir}" classes.dex`, { stdio: 'inherit' });
execSync(`"${JAR}" uf "${unsignedApk}" -C "${BUILD_DIR}" assets`, { stdio: 'inherit' });

// 11. Paso 6: Firma oficial v1 + v2 + v3 + zipalign con uber-apk-signer
console.log('10. Firmando y optimizando APK (zipalign + v1 + v2 + v3)...');
execSync(`java -jar "${UBER_SIGNER}" -a "${unsignedApk}" --ks "${KEYSTORE}" --ksAlias actas-ua --ksPass sBknWCD7as_e --ksKeyPass sBknWCD7as_e -o "${outDir}"`, { stdio: 'inherit' });

const signedFiles = fs.readdirSync(outDir).filter(f => f.endsWith('.apk'));
if (signedFiles.length === 0) throw new Error('No se encontró el APK firmado en ' + outDir);

const finalSignedApk = path.join(outDir, signedFiles[0]);

// 12. Copiar al directorio público de downloads con nombre oficial APPTAS
fs.copyFileSync(finalSignedApk, OUTPUT_APK);
fs.copyFileSync(finalSignedApk, DOWNLOADS_COPY);
fs.copyFileSync(finalSignedApk, path.join(ROOT_DIR, 'downloads/Actas_Autonoma.apk'));
fs.copyFileSync(finalSignedApk, 'C:/Users/AUTONOMA/Downloads/Actas_Autonoma.apk');

const stat = fs.statSync(OUTPUT_APK);
console.log('====================================================');
console.log('  ¡APK NATIVO INDEPENDIENTE GENERADO CON ÉXITO!');
console.log('====================================================');
console.log('Ruta 1 (Web):      ', OUTPUT_APK);
console.log('Ruta 2 (Descargas):', DOWNLOADS_COPY);
console.log('Tamaño APK:        ', (stat.size / 1024).toFixed(1), 'KB (' + stat.size + ' bytes)');
console.log('Estado:             100% Offline, Sin navegador, Sin caídas');
console.log('====================================================');
