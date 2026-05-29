using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
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
        private static bool mainWindowReady = false;
        private static bool launchErrorShown = false;
        private static DateTime launchStartedAt;
        private static string lastStatusMessage = "";

        private static readonly string[] StatusMessages = new string[]
        {
            "正在初始化运行环境...",
            "正在加载 Sequence Cutout Studio...",
            "正在准备本地处理工具...",
            "正在检查视频处理和自动去背景工具...",
            "首次启动可能需要 30–60 秒，请不要重复双击。"
        };

        private const int StartupTimeoutSeconds = 120;

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
        private static string statusFilePath;

        private static void StartMainApp(string appExe)
        {
            try
            {
                string launchId = Guid.NewGuid().ToString("N");
                readyFilePath = Path.Combine(
                    Path.GetTempPath(),
                    "SequenceCutoutStudio-" + launchId + ".ready"
                );
                statusFilePath = Path.Combine(
                    Path.GetTempPath(),
                    "SequenceCutoutStudio-" + launchId + ".status"
                );

                if (File.Exists(readyFilePath))
                {
                    File.Delete(readyFilePath);
                }
                if (File.Exists(statusFilePath))
                {
                    File.Delete(statusFilePath);
                }

                appProcess = new Process();
                appProcess.StartInfo.FileName = appExe;
                appProcess.StartInfo.WorkingDirectory = Path.GetDirectoryName(appExe);
                appProcess.StartInfo.UseShellExecute = false;
                appProcess.StartInfo.EnvironmentVariables["SCS_LAUNCHER_READY_FILE"] = readyFilePath;
                appProcess.StartInfo.EnvironmentVariables["SCS_LAUNCHER_STATUS_FILE"] = statusFilePath;
                appProcess.EnableRaisingEvents = true;

                appProcess.Exited += delegate
                {
                    if (!mainWindowReady && !launchErrorShown)
                    {
                        ShowLaunchError(
                            "主程序启动后提前退出。",
                            "退出码：" + appProcess.ExitCode.ToString()
                        );
                    }
                    SafeCloseSplash();
                };

                launchStartedAt = DateTime.Now;
                lastStatusMessage = StatusMessages[0];
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

            if ((DateTime.Now - launchStartedAt).TotalSeconds > StartupTimeoutSeconds)
            {
                ShowLaunchError(
                    "启动等待超时。",
                    "最后状态：" + (string.IsNullOrEmpty(lastStatusMessage) ? "正在启动..." : lastStatusMessage)
                );

                try
                {
                    if (!appProcess.HasExited)
                    {
                        appProcess.Kill();
                    }
                }
                catch
                {
                }

                SafeCloseSplash();
                return;
            }

            if (!string.IsNullOrEmpty(readyFilePath) && File.Exists(readyFilePath))
            {
                mainWindowReady = true;
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
            statusTimer.Interval = 1000;
            statusTimer.Tick += delegate
            {
                if (statusLabel == null || statusLabel.IsDisposed)
                {
                    return;
                }

                string statusFromApp = ReadStatusFile();
                if (!string.IsNullOrEmpty(statusFromApp))
                {
                    lastStatusMessage = statusFromApp;
                    statusLabel.Text = statusFromApp;
                    return;
                }

                statusIndex = (statusIndex + 1) % StatusMessages.Length;
                lastStatusMessage = StatusMessages[statusIndex];
                statusLabel.Text = lastStatusMessage;
            };
            statusTimer.Start();
        }

        private static string ReadStatusFile()
        {
            if (string.IsNullOrEmpty(statusFilePath) || !File.Exists(statusFilePath))
            {
                return "";
            }

            try
            {
                string text = File.ReadAllText(statusFilePath, Encoding.UTF8).Trim();
                return text.Length > 80 ? text.Substring(0, 80) : text;
            }
            catch
            {
                return "";
            }
        }

        private static void ShowLaunchError(string title, string detail)
        {
            if (splashForm != null && splashForm.InvokeRequired)
            {
                splashForm.BeginInvoke(new Action(delegate { ShowLaunchError(title, detail); }));
                return;
            }

            if (launchErrorShown)
            {
                return;
            }

            launchErrorShown = true;

            MessageBox.Show(
                title + "\n\n" + detail + "\n\n请重新打开软件；如果问题重复出现，请把这个提示和内测版本号发给开发人员。",
                "Sequence Cutout Studio 启动失败",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );
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
