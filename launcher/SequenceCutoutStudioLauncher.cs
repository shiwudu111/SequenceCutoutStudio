using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;

namespace SequenceCutoutStudioLauncher
{
    static class Program
    {
        private static Process appProcess;
        private static Timer checkTimer;
        private static Timer statusTimer;
        private static Form splashForm;
        private static Label statusLabel;
        private static int statusIndex = 0;

        private static readonly string[] StatusMessages = new string[]
        {
            "正在初始化运行环境...",
            "正在加载 Sequence Cutout Studio...",
            "正在准备本地处理工具...",
            "正在检查 FFmpeg / Python / rembg...",
            "首次启动可能需要 30–60 秒，请不要重复双击。"
        };

        [DllImport("user32.dll")]
        private static extern bool IsWindow(IntPtr hWnd);

        [DllImport("user32.dll")]
        private static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

        [DllImport("user32.dll")]
        private static extern bool SetForegroundWindow(IntPtr hWnd);

        private const int SW_RESTORE = 9;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string rootDir = AppDomain.CurrentDomain.BaseDirectory;
            string appExe = Path.Combine(rootDir, "app", "SequenceCutoutStudio.exe");

            if (!File.Exists(appExe))
            {
                MessageBox.Show(
                    "找不到主程序：\n" + appExe,
                    "Sequence Cutout Studio 启动失败",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                return;
            }

            splashForm = CreateSplashForm(rootDir);

            splashForm.Shown += delegate
            {
                StartStatusTimer();
                StartMainApp(appExe);
            };

            Application.Run(splashForm);
        }

        private static string readyFilePath;

        private static void StartMainApp(string appExe)
        {
            try
            {
                readyFilePath = Path.Combine(
                    Path.GetTempPath(),
                    "SequenceCutoutStudio-" + Guid.NewGuid().ToString("N") + ".ready"
                );

                if (File.Exists(readyFilePath))
                {
                    File.Delete(readyFilePath);
                }

                appProcess = new Process();
                appProcess.StartInfo.FileName = appExe;
                appProcess.StartInfo.WorkingDirectory = Path.GetDirectoryName(appExe);
                appProcess.StartInfo.UseShellExecute = false;
                appProcess.StartInfo.EnvironmentVariables["SCS_LAUNCHER_READY_FILE"] = readyFilePath;
                appProcess.EnableRaisingEvents = true;

                appProcess.Exited += delegate
                {
                    SafeCloseSplash();
                };

                appProcess.Start();

                checkTimer = new Timer();
                checkTimer.Interval = 300;
                checkTimer.Tick += delegate
                {
                    CheckMainWindowReady();
                };
                checkTimer.Start();
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    "启动主程序失败：\n" + ex.Message,
                    "Sequence Cutout Studio 启动失败",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );

                SafeCloseSplash();
            }
        }
        private static void CheckMainWindowReady()
        {
            if (appProcess == null)
            {
                return;
            }

            if (appProcess.HasExited)
            {
                SafeCloseSplash();
                return;
            }

            if (!string.IsNullOrEmpty(readyFilePath) && File.Exists(readyFilePath))
            {
                appProcess.Refresh();

                IntPtr mainWindowHandle = appProcess.MainWindowHandle;

                if (mainWindowHandle != IntPtr.Zero && IsWindow(mainWindowHandle))
                {
                    ShowWindow(mainWindowHandle, SW_RESTORE);
                    SetForegroundWindow(mainWindowHandle);
                }

                SafeCloseSplash();
            }
        }

        private static Form CreateSplashForm(string rootDir)
        {
            Form form = new Form();
            form.Width = 640;
            form.Height = 360;
            form.StartPosition = FormStartPosition.CenterScreen;
            form.FormBorderStyle = FormBorderStyle.None;
            form.MaximizeBox = false;
            form.MinimizeBox = false;
            form.ShowInTaskbar = true;
            form.TopMost = true;
            form.BackColor = Color.FromArgb(255, 247, 232);

            try
            {
                using (Stream iconStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("LauncherIcon"))
                {
                    if (iconStream != null)
                    {
                        form.Icon = new Icon(iconStream);
                    }
                }

                using (Stream splashStream = Assembly.GetExecutingAssembly().GetManifestResourceStream("SplashBmp"))
                {
                    if (splashStream != null)
                    {
                        Image splashImage = Image.FromStream(splashStream);

                        form.BackgroundImage = splashImage;
                        form.BackgroundImageLayout = ImageLayout.Stretch;

                        Panel overlay = CreateOverlayPanel();
                        form.Controls.Add(overlay);
                        overlay.BringToFront();

                        return form;
                    }
                }
            }
            catch
            {
                // 如果内置资源读取失败，就继续走下面的 fallback 文本启动页
            }

            Panel fallback = CreateFallbackPanel();
            form.Controls.Add(fallback);

            return form;
        }

        private static Panel CreateOverlayPanel()
        {
            Panel panel = new Panel();
            panel.Dock = DockStyle.Fill;
            panel.BackColor = Color.Transparent;

            Label hint = new Label();
            hint.Text = "正在启动，请稍候...";
            hint.Font = new Font("Microsoft YaHei UI", 11, FontStyle.Bold);
            hint.ForeColor = Color.FromArgb(61, 42, 31);
            hint.BackColor = Color.FromArgb(245, 255, 247, 232);
            hint.AutoSize = false;
            hint.TextAlign = ContentAlignment.MiddleCenter;
            hint.SetBounds(170, 258, 300, 28);

            ProgressBar bar = new ProgressBar();
            bar.Style = ProgressBarStyle.Marquee;
            bar.MarqueeAnimationSpeed = 28;
            bar.SetBounds(170, 292, 300, 12);

            statusLabel = new Label();
            statusLabel.Text = StatusMessages[0];
            statusLabel.Font = new Font("Microsoft YaHei UI", 9, FontStyle.Regular);
            statusLabel.ForeColor = Color.FromArgb(111, 89, 71);
            statusLabel.BackColor = Color.FromArgb(245, 255, 247, 232);
            statusLabel.AutoSize = false;
            statusLabel.TextAlign = ContentAlignment.MiddleCenter;
            statusLabel.SetBounds(80, 312, 480, 24);

            panel.Controls.Add(hint);
            panel.Controls.Add(bar);
            panel.Controls.Add(statusLabel);

            return panel;
        }

        private static Panel CreateFallbackPanel()
        {
            Panel panel = new Panel();
            panel.Dock = DockStyle.Fill;
            panel.BackColor = Color.FromArgb(255, 247, 232);

            Label title = new Label();
            title.Text = "Sequence Cutout Studio";
            title.Font = new Font("Microsoft YaHei UI", 24, FontStyle.Bold);
            title.ForeColor = Color.FromArgb(46, 36, 29);
            title.AutoSize = false;
            title.TextAlign = ContentAlignment.MiddleCenter;
            title.SetBounds(0, 78, 640, 52);

            Label subtitle = new Label();
            subtitle.Text = "序列帧透明化处理工作台";
            subtitle.Font = new Font("Microsoft YaHei UI", 12, FontStyle.Regular);
            subtitle.ForeColor = Color.FromArgb(111, 89, 71);
            subtitle.AutoSize = false;
            subtitle.TextAlign = ContentAlignment.MiddleCenter;
            subtitle.SetBounds(0, 140, 640, 28);

            Label loading = new Label();
            loading.Text = "正在启动，请稍候...";
            loading.Font = new Font("Microsoft YaHei UI", 11, FontStyle.Bold);
            loading.ForeColor = Color.FromArgb(61, 42, 31);
            loading.AutoSize = false;
            loading.TextAlign = ContentAlignment.MiddleCenter;
            loading.SetBounds(0, 210, 640, 28);

            ProgressBar bar = new ProgressBar();
            bar.Style = ProgressBarStyle.Marquee;
            bar.MarqueeAnimationSpeed = 28;
            bar.SetBounds(170, 252, 300, 12);

            statusLabel = new Label();
            statusLabel.Text = StatusMessages[0];
            statusLabel.Font = new Font("Microsoft YaHei UI", 9, FontStyle.Regular);
            statusLabel.ForeColor = Color.FromArgb(138, 116, 99);
            statusLabel.AutoSize = false;
            statusLabel.TextAlign = ContentAlignment.MiddleCenter;
            statusLabel.SetBounds(0, 282, 640, 24);

            panel.Controls.Add(title);
            panel.Controls.Add(subtitle);
            panel.Controls.Add(loading);
            panel.Controls.Add(bar);
            panel.Controls.Add(statusLabel);

            return panel;
        }

        private static void StartStatusTimer()
        {
            statusTimer = new Timer();
            statusTimer.Interval = 1400;
            statusTimer.Tick += delegate
            {
                if (statusLabel == null || statusLabel.IsDisposed)
                {
                    return;
                }

                statusIndex = (statusIndex + 1) % StatusMessages.Length;
                statusLabel.Text = StatusMessages[statusIndex];
            };
            statusTimer.Start();
        }

        private static void SafeCloseSplash()
        {
            if (checkTimer != null)
            {
                checkTimer.Stop();
                checkTimer.Dispose();
                checkTimer = null;
            }

            if (statusTimer != null)
            {
                statusTimer.Stop();
                statusTimer.Dispose();
                statusTimer = null;
            }

            if (splashForm != null && !splashForm.IsDisposed)
            {
                if (splashForm.InvokeRequired)
                {
                    splashForm.BeginInvoke(new Action(SafeCloseSplash));
                    return;
                }

                splashForm.Close();
            }
        }
    }
}