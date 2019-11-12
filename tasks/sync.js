/*
Sync assets to S3, instead of checking into Git
*/

module.exports = function(grunt) {

  var async = require("async");
  var aws = require("aws-sdk");
  var fs = require("fs");
  var path = require("path").posix;
  var shell = require("shelljs");
  var mime = require("mime");
  
  grunt.registerTask("sync", "Sync to S3 for assets", function(target = "stage") {
    var done = this.async();

    shell.mkdir("-p", "src/assets/covers");

    var config = require("../project.json");
    var dest = config.s3[target];
    var localSynced = "src/assets/covers";
    var remoteSynced = path.join(dest.path, "assets/covers");

    var creds = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_DEFAULT_REGION || "us-west-1"
    };
    if (!creds.accessKeyId) {
      grunt.fail.fatal("Missing AWS configuration variables.")
    }
    aws.config.update(creds);
    var s3 = new aws.S3();

    var files = grunt.file.expand({ cwd: localSynced, filter: "isFile" }, "**/*");
    var local = files.map(function(f) {
      var stat = fs.statSync(path.join(localSynced, f));
      return {
        file: f,
        size: stat.size,
        mtime: stat.mtime
      }
    });

    async.waterfall([
      function(next) {
        s3.listObjects({
          Bucket: dest.bucket,
          Prefix: path.join(dest.path, "assets/covers")
        }, function(err, results) {
          if (err) return next(err);
          var asFiles = results.Contents.map(function(obj) {
            return {
              file: obj.Key.replace(/.*?assets\/covers\//, ""),
              size: obj.Size,
              key: obj.Key,
              mtime: obj.LastModified
            }
          });
          next(null, asFiles);
        });
      },
      function(remote, next) {
        // compare files
        var up = [];
        var down = [];
        // check for existing local files and their counterparts
        local.forEach(function(localItem) {
          var remoteItem = remote.filter(r => r.file == localItem.file).pop();
          if (!remoteItem) {
            up.push(localItem);
          } else {
            // compare sizes, dates
            if (localItem.size != remoteItem.size) {
              if (localItem.mtime > remoteItem.mtime) {
                up.push(localItem);
              } else {
                down.push(remoteItem);
              }
            }
          }
        });
        // check for missing local files
        remote.forEach(function(remoteItem) {
          var localItem = local.filter(l => l.file == remoteItem.file).pop();
          if (!localItem) {
            down.push(remoteItem);
          }
        });

        next(null, up, down);
      },
      function(up, down, next) {
        // get remote files
        async.each(down, function(item, callback) {
          console.log(`Download: ${item.file}`);
          s3.getObject({
            Bucket: dest.bucket,
            Key: item.key
          }, function(err, data) {
            if (err) return callback(err);
            fs.mkdirSync(path.dirname(path.join(localSynced, item.file)), { recursive: true });
            fs.writeFileSync(path.join(localSynced, item.file), data.Body);
            callback();
          })
        }, err => next(err, up));
      },
      function(up, next) {
        // put local files
        async.each(up, function(item, callback) {
          console.log(`Upload: ${item.file}`);
          var buffer = fs.readFileSync(path.join(localSynced, item.file));
          var obj = {
            Bucket: dest.bucket,
            Key: path.join(remoteSynced, item.file),
            Body: buffer,
            ContentType: mime.getType(item.file),
            CacheControl: "public,max-age=300"
          };
          if (target == "live") {
            obj.ACL = "public-read";
          }
          s3.putObject(obj, callback)
        }, next)
      }
    ], function(err) {
      if (err) grunt.fail.fatal(err);
      done();
    });

  });

};
