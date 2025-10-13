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
    const body = await req.json();
    if (!body) {
      return NextResponse.json({ error: "No metadata provided" }, { status: 400 });
    }

    const metadataBuffer = Buffer.from(JSON.stringify(body));
    const fileName = `metadata-${Date.now()}.json`;

    const params = {
      Bucket: "websitefiles",
      Key: `VeryMarket/metadata/${fileName}`,
      Body: metadataBuffer,
      ContentType: "application/json",
    };
 
    // Wrap in Promise to capture headers
    const tokenURI = await new Promise((resolve, reject) => {
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

    return NextResponse.json({ tokenURI });
  } catch (err) {
    console.error("Upload metadata error:", err);
    return NextResponse.json({ error: "Upload failed", details: err.message }, { status: 500 });
  }
}