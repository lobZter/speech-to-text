const fs = require('fs');
const path = require('path');
const config = require('./config.js')
const speech = require('@google-cloud/speech');
const Storage = require('@google-cloud/storage');
const cloudconvert = new (require('cloudconvert'))(config.CLOUDCONVERT_KEY);
const client = new speech.SpeechClient();
const storage = new Storage();


// convert file encoding to flac
function convertToFlac(inputPath, outputPath, cb) {
  let fileType = inputPath.split('.')[1];
  let writeStream = fs.createWriteStream(outputPath);
  writeStream.on('close', function() {cb(outputPath)});
  fs.createReadStream(inputPath)
    .pipe(cloudconvert.convert({
        "inputformat": fileType,
        "outputformat": "flac",
        "input": "upload",
        "converteroptions": {
          "audio_codec": "FLAC",
          "audio_bitrate": "128",
          "audio_channels": "1",
          "audio_frequency": "16000",
          "audio_normalize": null,
          "trim_to": null,
          "trim_from": null,
          "strip_metatags": false,
          "command": null
      }
    }))
    .pipe(writeStream);
}

// upload file to google cloud service
function uploadFile(bucketName, filePath, cb) {
  let filename = path.basename(filePath);
  storage
    .bucket(bucketName)
    .upload(filePath)
    .then(() => {
      console.log(`${filename} uploaded to ${bucketName}.`);
      const gcsUri = 'gs://' + bucketName + '/' + filename;
      cb(gcsUri);
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

// speech to text
function transcription(gcsUri, outputFilePath, cb) {
  const encoding = 'FLAC';
  const sampleRateHertz = 16000;
  const languageCode = 'zh-TW';
  const config = {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
  };
  const audio = {
    uri: gcsUri,
  };
  const request = {
    config: config,
    audio: audio
  };

  client
    .longRunningRecognize(request)
    .then(data => {
      const operation = data[0];
      // Get a Promise representation of the final result of the job
      return operation.promise();
    })
    .then(data => {
      const response = data[0];
      const transcription = response.results
        .map(result => result.alternatives[0].transcript)
        .join('\n');
      fs.appendFileSync(outputFilePath, `${transcription}`, 'utf8');
      console.log(`${path.basename(outputFilePath)} saved.`);
      cb();
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

// // sample usage
// var files = fs.readdirSync(config.speechPath);
// files.forEach(function(val, idx, arr) {
//   console.log(`Processing ${val}`);
//   let speechIn = path.join(config.speechPath, val);
//   let speechOut = path.join(config.speechPath, val.split('.')[0] + '.flac');
//   let txtOut = path.join(config.txtPath, val.split('.')[0] + '.txt');
//   convertToFlac(speechIn, speechOut, function(file) {
//     uploadFile(config.bucketName, file, function(gcsUri) {
//       transcription(gcsUri, txtOut);
//     });
//   });
// });
