const speech = require('@google-cloud/speech');
const Storage = require('@google-cloud/storage');
const fs = require('fs');
const client = new speech.SpeechClient();
const storage = new Storage();

const bucketName = 'speech-api-20180423';
const filename = 'ccc.flac';
const gcsUri = 'gs://' + bucketName + '/' + filename;
const encoding = 'FLAC';
const sampleRateHertz = 48000;
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

function uploadFile(cb) {
  storage
    .bucket(bucketName)
    .upload(filename)
    .then(() => {
      console.log(`${filename} uploaded to ${bucketName}.`);
      cb();
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

function transcription() {
  client
    .longRunningRecognize(request)
    .then(data => {
      const operation = data[0];
      // Get a Promise representation of the final result of the job
      return operation.promise();
    })
    .then(data => {
      const response = data[0];
      const outfile = filename.split('.')[0] + '.txt';
      response.results.forEach(result => {
        console.log(`${result.alternatives[0].transcript}`);
        fs.appendFileSync(outfile, `${result.alternatives[0].transcript}`, 'utf8');
        result.alternatives[0].words.forEach(wordInfo => {
          // NOTE: If you have a time offset exceeding 2^32 seconds, use the
          // wordInfo.{x}Time.seconds.high to calculate seconds.
          const startSecs =
            `${wordInfo.startTime.seconds}` +
            `.` +
            wordInfo.startTime.nanos / 100000000;
          const endSecs =
            `${wordInfo.endTime.seconds}` +
            `.` +
            wordInfo.endTime.nanos / 100000000;
          console.log(`Word: ${wordInfo.word}`);
          fs.appendFileSync(outfile, `Word: ${wordInfo.word}`, 'utf8');
          console.log(`\t ${startSecs} secs - ${endSecs} secs`);
          fs.appendFileSync(outfile, `\t ${startSecs} secs - ${endSecs} secs`, 'utf8');
        });
      });
    })
    .catch(err => {
      console.error('ERROR:', err);
    });
}

uploadFile(transcription);