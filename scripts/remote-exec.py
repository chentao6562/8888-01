"""
远程执行助手 · 通过 paramiko SSH 到 ECS 执行命令并流式输出日志。
仅用于测试服务器 · 密码明文读自 CLAUDE.md §9.2 / env 变量。

用法：
  python scripts/remote-exec.py <command_or_@file>

例子：
  python scripts/remote-exec.py "hostname && uname -a"
  python scripts/remote-exec.py @scripts/ecs-bootstrap.sh    # 把本地 sh 内容上传并执行
"""
import os, sys, time, paramiko

HOST = os.environ.get('ECS_HOST', '39.104.101.12')
USER = os.environ.get('ECS_USER', 'root')
PASS = os.environ.get('ECS_PASSWORD', 'Cc65623518+')

def run(cmd: str, timeout: int = 1800) -> int:
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    print(f"[connected {USER}@{HOST}]", flush=True)
    try:
        chan = client.get_transport().open_session()
        chan.get_pty(width=200, height=50)
        chan.exec_command(cmd)
        start = time.time()
        while True:
            if chan.recv_ready():
                data = chan.recv(8192)
                if data:
                    sys.stdout.buffer.write(data); sys.stdout.flush()
            if chan.recv_stderr_ready():
                data = chan.recv_stderr(8192)
                if data:
                    sys.stderr.buffer.write(data); sys.stderr.flush()
            if chan.exit_status_ready():
                break
            if time.time() - start > timeout:
                chan.close()
                print(f"\n[timeout after {timeout}s]", flush=True)
                return 124
            time.sleep(0.1)
        # drain remaining
        while chan.recv_ready():
            data = chan.recv(8192)
            sys.stdout.buffer.write(data); sys.stdout.flush()
        while chan.recv_stderr_ready():
            data = chan.recv_stderr(8192)
            sys.stderr.buffer.write(data); sys.stderr.flush()
        rc = chan.recv_exit_status()
        print(f"\n[exit {rc}]", flush=True)
        return rc
    finally:
        client.close()

def upload_and_run(local_path: str, timeout: int = 1800) -> int:
    with open(local_path, 'r', encoding='utf-8') as f:
        content = f.read()
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(HOST, username=USER, password=PASS, timeout=30)
    try:
        sftp = client.open_sftp()
        remote = '/tmp/remote-exec-' + os.path.basename(local_path)
        with sftp.open(remote, 'w') as rf:
            rf.write(content)
        sftp.chmod(remote, 0o755)
        sftp.close()
        print(f"[uploaded → {remote}]", flush=True)
    finally:
        client.close()
    return run(f'bash {remote}', timeout=timeout)

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    arg = sys.argv[1]
    if arg.startswith('@'):
        sys.exit(upload_and_run(arg[1:]))
    sys.exit(run(arg))
