import { Client, FileType } from "basic-ftp";
import fs from 'node:fs';

const pathToBackup = process.env.PATH_TO_BACKUP;
const ignoreDir = ['Screenshots', 'Camera', 'Screen recordings', 'Clipped images', 'Videocaptures', 'Memes'];

async function mapAndTransferFiles() {
    const client = new Client(0);

    let result: { name: string, pics: string[] }[] = [];
    let filesTransferd = 0;
    let filesSkipped = 0;

    try {
        await client.access({
            host: process.env.IP,
            port: parseInt(process.env.PORT || '0'),
            user: process.env.USER,
            password: process.env.PASSWORD,
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
                    filesSkipped++;
                }
            }
        }
    } catch (err) {
        console.error("error:", err);
    } finally {
        client.close();
        console.log(`files transfer: ${filesTransferd} files skipped: ${filesSkipped}`);
    }
}

await mapAndTransferFiles();
