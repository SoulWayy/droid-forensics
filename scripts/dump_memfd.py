import os, sys, time, shutil

pid = sys.argv[1]
fd_dir = f"/proc/{pid}/fd"

try:
    for fd in os.listdir(fd_dir):
        link = os.readlink(f"{fd_dir}/{fd}")
        if "memfd:" in link or "deleted" in link:
            dest = f"/home/jan/Droid-onderzoek-triage/memfd_dumps/memfd_{pid}_{fd}.bin"
            try:
                shutil.copy2(f"{fd_dir}/{fd}", dest)
                print(f"Dumped {link} to {dest}")
            except Exception as e:
                pass
except Exception as e:
    print(e)
