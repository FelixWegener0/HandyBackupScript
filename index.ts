import { Client, FileType } from "basic-ftp";
import fs from 'node:fs';

const pathToBackup = 'F:/BioAufgaben/';
const pathToBackupOnPc = 'C:/handyBackup/bioProjekt/';

const ignoreDir = ['Screenshots', 'Camera', 'Screen recordings', 'Clipped images', 'Videocaptures', 'Memes'];

async function mapAndTransferFiles() {
    const client = new Client(0);

    let result: { name: string, pics: string[] }[] = [];
    let filesTransferd = 0;
    let filesSkiped = 0;

    try {
        await client.access({
            host: "192.168.0.234",
            port: 4487,
            user: "pc",
            password: "638246",
        });

        console.log("Verbunden mit FTP-Server!");
        const files = await client.list("/device/DCIM");

        const directories = files.filter(file => file.type === FileType.Directory).map(dir => dir.name);
        const directoriesFiltered = directories.filter(item => !ignoreDir.includes(item));

        directoriesFiltered.forEach(dir => {
            result.push({ name: dir, pics: [] });
        });

        for (const dir of result) {
            const fileResult= await client.list(`/device/DCIM/${dir.name}`);
            fileResult.forEach((file, index) => {
                dir.pics[index] = file.name;
            })
        }

        for (const dir of result) {
            const targetDir = `${pathToBackup}/${dir.name}`;

            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            for (const file of dir.pics) {
                const localPath = `${targetDir}/${file}`;
                const remotePath = `/device/DCIM/${dir.name}/${file}`;

                if (!fs.existsSync(localPath)) {
                    await client.downloadTo(localPath, remotePath);
                    console.log(`${remotePath} → ${localPath}`);
                    filesTransferd++;
                } else {
                    console.log(`Datei existiert bereits: ${localPath}`);
                    filesSkiped++;
                }
            }
        }
    } catch (err) {
        console.error("Fehler:", err);
    } finally {
        client.close();
        console.log(`files transfer: ${filesTransferd} files skiped: ${filesSkiped}`);
    }
}

await mapAndTransferFiles();
