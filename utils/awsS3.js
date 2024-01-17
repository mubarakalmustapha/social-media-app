const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

// Set AWS credentials
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

const s3 = new AWS.S3();

function uploadToS3(file) {
  const fileExtension = path.extname(file.originalname);
  const contentType = getContentType(fileExtension);

  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
    Key: `documents/${uuidv4()}${fileExtension}`,
    Body: file.buffer,
    ContentType: contentType,
  };

  return new Promise((resolve, reject) => {
    s3.upload(params, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data.Location);
      }
    });
  });
}

function getContentType(fileExtension) {
  switch (fileExtension.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".pdf":
      return "application/pdf";
    case ".doc":
    case ".docx":
      return "application/msword";
    default:
      return "application/octet-stream";
  }
}

async function removeCoverPhotoFromS3(coverPhotoURL) {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const objectKey = coverPhotoURL.replace(
    `https://${bucket}.s3.amazonaws.com/`,
    ""
  );

  const params = {
    Bucket: bucket,
    Key: objectKey,
  };

  try {
    await s3.deleteObject(params).promise();
    console.log(`CoverPhoto removed from S3: ${coverPhotoURL}`);
  } catch (error) {
    console.error(`Error removing CoverPhoto from S3: ${error.message}`);
    throw error;
  }
}

async function removeProfilePictureFromS3(profilePictureURL) {
  const bucket = process.env.AWS_S3_BUCKET_NAME;
  const objectKey = profilePictureURL.replace(
    `https://${bucket}.s3.amazonaws.com/`,
    ""
  );

  const params = {
    Bucket: bucket,
    Key: objectKey,
  };

  try {
    await s3.deleteObject(params).promise();
    console.log(`ProfilePicture removed from S3: ${profilePictureURL}`);
  } catch (error) {
    console.error(`Error removing ProfilePicture from S3: ${error.message}`);
    throw error;
  }
}

module.exports = {
  uploadToS3,
  removeCoverPhotoFromS3,
  removeProfilePictureFromS3,
};
