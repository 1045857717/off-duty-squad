"""Package the installed Windows Electron runtime. Version comes from package.json."""
from pathlib import Path
import hashlib
import json
import shutil
import sys
import zipfile

root = Path(__file__).resolve().parents[1]
version = json.loads((root / 'package.json').read_text(encoding='utf-8'))['version']
if sys.platform != 'win32':
    raise SystemExit('Desktop packaging requires Windows x64.')
runtime = root / 'node_modules/electron/dist'
if not (runtime / 'electron.exe').is_file():
    raise SystemExit('Install dependencies on Windows with Electron binary download enabled.')
release = root / 'releases'
release.mkdir(exist_ok=True)
cache = (root / 'node_modules/.cache').resolve()
work = (cache / ('offshift-desktop-' + version)).resolve()
assert work.is_relative_to(cache) and work != cache, 'Unsafe packaging target'
if work.exists():
    shutil.rmtree(work)
shutil.copytree(runtime, work)
(work / 'electron.exe').rename(work / '带薪摸鱼.exe')
app = work / 'resources/app'
app.mkdir(parents=True, exist_ok=True)
shutil.copytree(root / 'electron', app / 'electron', ignore=shutil.ignore_patterns('client-config.json', 'game-server.json'))
(app / 'package.json').write_text(json.dumps({'name': 'before-clocking-out-client', 'version': version, 'main': 'electron/client/bootstrap.cjs', 'license': 'MIT'}, indent=2), encoding='utf-8')
(work / '使用说明.txt').write_text(
    '带薪摸鱼 ' + version + ' Windows x64 便携客户端\n'
    '解压全部文件后运行 带薪摸鱼.exe，无需 Node。\n'
    '首次输入与网页相同的服务器地址。也可放入网页下载的 game-server.json。\n'
    'F9 小窗 / F10 隐藏 / Ctrl+Shift+B 全局显示 / Ctrl+Shift+X 鼠标穿透。\n'
    '关闭后再次运行会连接最近服务器。\n'
    '删除 %APPDATA%/before-clocking-out-client/game-server.json 可重新配置。\n'
    '未代码签名；本包只包含桌面客户端，联机服务器需单独部署。\n', encoding='utf-8')
shutil.copyfile(root / 'LICENSE', app / 'LICENSE')
shutil.copyfile(root / 'LICENSE', work / 'LICENSE.project.txt')
shutil.copyfile(root / 'THIRD_PARTY_NOTICES.md', work / 'THIRD_PARTY_NOTICES.project.md')
target = release / 'offshift-desktop-win-x64.zip'
with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for item in sorted(work.rglob('*')):
        if item.is_file():
            archive.write(item, 'offshift-desktop/' + item.relative_to(work).as_posix())
with zipfile.ZipFile(target) as archive:
    assert archive.testzip() is None
    assert 'offshift-desktop/LICENSE.project.txt' in archive.namelist()
    assert 'offshift-desktop/resources/app/LICENSE' in archive.namelist()
manifest = {'version': version, 'platform': 'Windows x64', 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'signed': False, 'file': target.name}
(release / 'desktop-release.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print(json.dumps(manifest, indent=2))
