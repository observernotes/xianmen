package com.xiantu.feichai;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;

/** 离线单机壳：用 WebView 加载内置的游戏页面，存档保存在本机 WebView 存储里。 */
public class MainActivity extends Activity {
    // 固定的“源”，让 localStorage 存档按同一来源长期保存（不会发起任何网络请求）
    private static final String BASE_URL = "https://appassets.androidplatform.net/";
    private WebView web;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        web = new WebView(this);
        web.setBackgroundColor(0xFF120F1C);
        web.setVerticalScrollBarEnabled(false);
        web.setHorizontalScrollBarEnabled(false);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);                 // 不受系统字体大小影响，避免版面错乱
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(false);

        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return openExternal(req.getUrl());
            }

            @Override
            @SuppressWarnings("deprecation")
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return openExternal(Uri.parse(url));
            }
        });

        setContentView(web);
        // 每次启动都重新载入页面，进度从本机存档恢复
        web.loadDataWithBaseURL(BASE_URL, readAsset("index.html"), "text/html", "utf-8", null);
        hideSystemBars();
    }

    /** 游戏内的外部链接（比如字体许可）交给浏览器打开。 */
    private boolean openExternal(Uri uri) {
        if (uri == null || uri.toString().startsWith(BASE_URL)) return false;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (Exception ignored) {
        }
        return true;
    }

    private String readAsset(String name) {
        try (InputStream in = getAssets().open(name)) {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            byte[] buf = new byte[65536];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        } catch (Exception e) {
            return "<p style='color:#fff'>游戏文件读取失败：" + e + "</p>";
        }
    }

    @SuppressWarnings("deprecation")
    private void hideSystemBars() {
        View decor = getWindow().getDecorView();
        decor.setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    /** 返回键：有可关闭的弹窗就关弹窗；剧情选择等必须作答的弹窗不响应；否则退到后台（不丢进度）。 */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        String js = "(function(){var m=document.getElementById('modal');"
                + "if((window.__xm_talk&&window.__xm_talk.on)||(window.__xm&&window.__xm.cine))return 'blocked';"
                + "if(m&&!m.hidden){var c=m.querySelector('.close');if(c){c.click();return 'closed';}return 'blocked';}"
                + "var t=document.getElementById('tip');if(t&&!t.hidden){t.click();return 'closed';}"
                + "return 'none';})()";
        web.evaluateJavascript(js, new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String v) {
                if (v != null && v.contains("none")) moveTaskToBack(true);
            }
        });
    }

    @Override
    protected void onPause() {
        // 切到后台时触发页面的保存逻辑
        web.evaluateJavascript("window.dispatchEvent(new Event('pagehide'))", null);
        web.onPause();
        web.pauseTimers();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        web.resumeTimers();
        // 回到前台：让页面把挂起的声音接上（audio.js 听 pageshow）
        web.evaluateJavascript("window.dispatchEvent(new Event('pageshow'))", null);
        hideSystemBars();
    }

    @Override
    protected void onDestroy() {
        if (web != null) {
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
