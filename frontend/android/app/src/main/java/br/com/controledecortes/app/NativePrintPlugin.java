package br.com.controledecortes.app;

import android.content.Context;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "NativePrint")
public class NativePrintPlugin extends Plugin {
    private WebView printWebView;

    @PluginMethod
    public void printHtml(PluginCall call) {
        String html = call.getString("html");
        String title = call.getString("title", "Relatório");
        if (html == null || html.isEmpty()) {
            call.reject("O documento está vazio.");
            return;
        }

        getActivity().runOnUiThread(() -> {
            try {
                printWebView = new WebView(getActivity());
                printWebView.setWebViewClient(new WebViewClient() {
                    private boolean submitted;

                    @Override
                    public void onPageFinished(WebView view, String url) {
                        if (submitted) return;
                        submitted = true;
                        try {
                            PrintManager manager = (PrintManager) getActivity().getSystemService(Context.PRINT_SERVICE);
                            PrintAttributes attributes = new PrintAttributes.Builder()
                                .setMediaSize(PrintAttributes.MediaSize.ISO_A4)
                                .setColorMode(PrintAttributes.COLOR_MODE_COLOR)
                                .build();
                            manager.print(title, view.createPrintDocumentAdapter(title), attributes);
                            call.resolve();
                        } catch (Exception error) {
                            call.reject("Não foi possível abrir a impressão do PDF.", error);
                        }
                    }
                });
                printWebView.loadDataWithBaseURL("https://localhost/", html, "text/html", "UTF-8", null);
            } catch (Exception error) {
                call.reject("Não foi possível preparar o documento PDF.", error);
            }
        });
    }
}
