import { APP_VERSION } from "./version";
import { createServer } from "./app";
const port = Number(process.env.PORT) || 3000;
const server = createServer();
server.http.listen(port, "0.0.0.0", () => {
  console.log(
    `\n  PAID BREAK CREW · 带薪摸鱼 ${APP_VERSION}\n  本机：http://localhost:${port}`,
  );
  if (process.env.PUBLIC_URL)
    console.log(`  公网入口：${process.env.PUBLIC_URL}`);
  else
    console.log(
      "  生产环境：通过配置的域名和HTTPS反向代理访问；邀请链接使用当前访问地址。",
    );
  console.log("  实时房间在当前进程；小队榜保存在 DATA_DIR。Ctrl+C 关闭。\n");
});
const stop = () => {
  server.close().then(() => process.exit(0));
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
