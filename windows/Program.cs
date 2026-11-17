using System.Diagnostics;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

static class Program
{
    [STAThread] // WebView2 needs an STA UI thread; top-level statements don't give one
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        var form = new Form
        {
            Text = "Glass Music", Width = 1280, Height = 820, StartPosition = FormStartPosition.CenterScreen, BackColor = Color.Black,
            Icon = new Icon(typeof(Program).Assembly.GetManifestResourceStream("GlassMusic.icon.ico")!),
        };
        var web = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = Color.Black };
        form.Controls.Add(web);
        form.Load += async (_, _) =>
        {
            try
            {
                // library, playlists and imported MP3s live here, so they survive updates of the app folder
                var data = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GlassMusic");
                await web.EnsureCoreWebView2Async(await CoreWebView2Environment.CreateAsync(null, data));
                var cw = web.CoreWebView2;
                // a fixed https origin keeps storage stable and lets the Deezer/SoundCloud embeds run; files load from disk, so the app opens offline
                cw.SetVirtualHostNameToFolderMapping("glassmusic.example", Path.Combine(AppContext.BaseDirectory, "app"), CoreWebView2HostResourceAccessKind.Allow);
                cw.NewWindowRequested += (_, e) => { e.Handled = true; Process.Start(new ProcessStartInfo(e.Uri) { UseShellExecute = true }); };
                cw.Navigate("https://glassmusic.example/index.html");
            }
            catch (Exception ex)
            {
                MessageBox.Show(form, "Glass Music could not start its web view (it needs the Microsoft Edge WebView2 Runtime).\n\n" + ex.Message, "Glass Music");
                form.Close();
            }
        };
        Application.Run(form);
    }
}
