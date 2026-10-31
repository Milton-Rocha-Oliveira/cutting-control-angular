package br.com.controledecortes.app;

import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;

public class MainActivity extends BridgeActivity {
    @Override
    protected void load() {
        registerPlugin(NativePrintPlugin.class);
        bridgeBuilder.addWebViewListener(new WebViewListener() {
            @Override
            public void onPageCommitVisible(WebView webView, String url) {
                webView.evaluateJavascript(
                    "(async()=>{const registrations=await navigator.serviceWorker.getRegistrations();"
                        + "const keys=await caches.keys();"
                        + "await Promise.all(registrations.map(registration=>registration.unregister()));"
                        + "await Promise.all(keys.map(key=>caches.delete(key)));"
                        + "return registrations.length>0||keys.length>0;})()",
                    removedOldWebCache -> {
                        if ("true".equals(removedOldWebCache)) {
                            webView.postDelayed(webView::reload, 100);
                        }
                    }
                );
            }
        });
        super.load();
    }
}
