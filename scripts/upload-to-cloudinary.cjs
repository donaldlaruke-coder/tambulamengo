const fs = require('fs');
const path = require('path');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// check env
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error("Missing Cloudinary environment variables in .env");
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const mediaFiles = [
  {
    localPath: 'public/mengo-badge.jpg',
    jsonPath: 'src/assets/mengo-badge.jpg.asset.json',
    resourceType: 'image',
    publicId: 'mengo-badge'
  },
  {
    localPath: 'public/hero-1.mp4',
    jsonPath: 'src/assets/hero-1.mp4.asset.json',
    resourceType: 'video',
    publicId: 'hero-1'
  },
  {
    localPath: 'public/hero-2.mp4',
    jsonPath: 'src/assets/hero-2.mp4.asset.json',
    resourceType: 'video',
    publicId: 'hero-2'
  },
  {
    localPath: 'public/hero-3.mp4',
    jsonPath: 'src/assets/hero-3.mp4.asset.json',
    resourceType: 'video',
    publicId: 'hero-3'
  },
  {
    localPath: 'public/hero-4.mp4',
    jsonPath: 'src/assets/hero-4.mp4.asset.json',
    resourceType: 'video',
    publicId: 'hero-4'
  },
  {
    localPath: 'public/hero-5.mp4',
    jsonPath: 'src/assets/hero-5.mp4.asset.json',
    resourceType: 'video',
    publicId: 'hero-5'
  }
];

async function uploadFile(file) {
  const absoluteLocalPath = path.resolve(__dirname, '..', file.localPath);
  const absoluteJsonPath = path.resolve(__dirname, '..', file.jsonPath);

  if (!fs.existsSync(absoluteLocalPath)) {
    console.error(`Local file not found: ${absoluteLocalPath}`);
    return;
  }

  console.log(`Uploading ${file.localPath} to Cloudinary...`);
  try {
    const result = await cloudinary.uploader.upload(absoluteLocalPath, {
      folder: 'tambulamengo',
      public_id: file.publicId,
      resource_type: file.resourceType,
      overwrite: true,
      invalidate: true
    });

    console.log(`Successfully uploaded. Cloudinary URL: ${result.secure_url}`);

    // Read existing asset JSON
    if (fs.existsSync(absoluteJsonPath)) {
      const jsonContent = JSON.parse(fs.readFileSync(absoluteJsonPath, 'utf8'));
      jsonContent.url = result.secure_url;
      // also optionally save details about cloudinary
      jsonContent.cloudinary_public_id = result.public_id;
      jsonContent.cloudinary_url = result.secure_url;
      fs.writeFileSync(absoluteJsonPath, JSON.stringify(jsonContent, null, 2), 'utf8');
      console.log(`Updated JSON file: ${file.jsonPath}`);
    } else {
      console.warn(`JSON file not found: ${absoluteJsonPath}`);
    }
  } catch (error) {
    console.error(`Error uploading ${file.localPath}:`, error);
  }
}

async function run() {
  for (const file of mediaFiles) {
    await uploadFile(file);
  }
  console.log("All uploads complete!");
}

run();
