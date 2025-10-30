import { NextResponse } from "next/server";
import AWS from "aws-sdk";

const s3 = new AWS.S3({
  accessKeyId: process.env.FILEBASE_ACCESS_KEY_ID,
  secretAccessKey: process.env.FILEBASE_SECRET_ACCESS_KEY,
  endpoint: "https://s3.filebase.com",
  region: "us-east-1",
  signatureVersion: "v4",
});

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const fileName = `${Date.now()}-${file.name}`;

    const params = {
      Bucket: "websitefiles",
      Key: `VeryMarket/${fileName}`,
      Body: buffer,
      ContentType: file.type,
    };

    // Wrap in Promise to capture headers
    const cidUrl = await new Promise((resolve, reject) => {
      const request = s3.putObject(params);

      request.on("httpHeaders", (statusCode, headers) => {
        if (statusCode === 200 && headers["x-amz-meta-cid"]) {
          resolve(`https://ipfs.filebase.io/ipfs/${headers["x-amz-meta-cid"]}`);
        } else {
          reject(new Error("Upload failed or CID missing"));
        }
      });

      request.on("error", (err) => reject(err));
      request.send();
    });
    console.log(cidUrl)
    return NextResponse.json({ cid: cidUrl });
  } catch (err) {
    console.log("Upload error:", err);
    return NextResponse.json({ error: "Upload failed", details: err.message }, { status: 500 });
  }
}
