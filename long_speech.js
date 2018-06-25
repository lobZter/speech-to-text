// Imports the Google Cloud client library
const speech = require('@google-cloud/speech');
const fs = require('fs');

// Creates a client
const client = new speech.SpeechClient();


/**
 * TODO(developer): Uncomment the following lines before running the sample.
 */
const gcsUri = 'gs://speech-api-20180423/out/' + process.argv[2] + '/' + process.argv[3] + '.flac';
const encoding = 'FLAC';
const sampleRateHertz = 44100;
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
  audio: audio,
};

// Detects speech in the audio file. This creates a recognition job that you
// can wait for now, or get its result later.
client
  .longRunningRecognize(request)
  .then(data => {
    console.log("Transcripting...")
    const operation = data[0];
    // Get a Promise representation of the final result of the job
    return operation.promise();
  })
  .then(data => {
    console.log("Writing file...")
    const response = data[0];
    const transcription = response.results
      .map(result => result.alternatives[0].transcript)
      .join('\n');
    fs.writeFile('output/' + process.argv[2] + '/' + process.argv[3] + '.txt', transcription, function(err) {
      if(err) {
        console.log('ERROR:', err);
        return;
      }
      console.log(process.argv[2] + '/' + process.argv[3] + ".txt was saved!");
    });
  })
  .catch(err => {
    console.error('ERROR:', err);
  });