/*

Uses the Google Sheets API to pull data from Sheets and load it onto shared
state. Writes the data out to JSON for later reference. Does not currently
check for existing data to merge--it does a fresh pull every time.

*/

var project = require("../project.json");
var async = require("async");
var os = require("os");
var path = require("path");
var { google } = require("googleapis");
var api = google.sheets("v4");

var { authenticate } = require("./googleauth");

var camelCase = function(str) {
  return str.replace(/[^\w]+(\w)/g, function(all, match) {
    return match.toUpperCase();
  });
};

var cast = function(str) {
  if (typeof str !== "string") {
    if (typeof str.value == "string") {
      str = str.value;
    } else {
      return str;
    }
  }
  if (str.match(/^-?(0?\.|[1-9])[\d\.]*$/) || str == "0") {
    var n = Number(str);
    if (isNaN(n)) return str;
    return n;
  }
  if (str.toLowerCase() == "true" || str.toLowerCase() == "false") {
    return str.toLowerCase() == "true" ? true : false;
  }
  return str;
};

module.exports = function(grunt) {

  grunt.registerTask("sheets", "Downloads from Google Sheets -> JSON", async function() {

    var auth = null;
    try {
      auth = authenticate();
    } catch (err) {
      console.log("No access token from ~/.google_oauth_token, private spreadsheets will be unavailable.", err)
    }

    var sheetKeys = project.sheets;

    if (!sheetKeys || !sheetKeys.length) {
      return grunt.fail.fatal("You must specify a spreadsheet key in project.json or auth.json!");
    }

    var done = this.async();

    for (var spreadsheetId of sheetKeys) {
      var book = (await api.spreadsheets.get({ auth, spreadsheetId })).data;
      var { sheets, spreadsheetId } = book; // eslint-disable-line
      for (var sheet of sheets) {
        if (sheet.properties.title[0] == "_") continue;
        var response = await api.spreadsheets.values.get({
          auth,
          spreadsheetId,
          range: `${sheet.properties.title}!A:AAA`,
          majorDimension: "ROWS"
        });
        var { values } = response.data;
        if (!values) continue;
        var header = values.shift();

        // replace "summary" with "text"
        const summaryIndex = header.indexOf('summary')
        if (summaryIndex !== -1) {
          header[summaryIndex] = 'text'
        }

        var isKeyed = header.indexOf("key") > -1;
        var isValued = header.indexOf("value") > -1;
        var out = isKeyed ? {} : [];
        for (var i=0; i<values.length; i++) {
          const row = values[i]
          // skip blank rows
          if (!row.length) continue;
          var obj = {};
          row.forEach(function(value, i) {
            var key = header[i];
            if (key[0] == "_" || !key) return;
            obj[key] = cast(value);

            // normalize tags from comma-delimited to pipe-delimited
            if (key === 'tags' && value.includes && value.includes(',')) {
              obj[key] = obj[key].replace(/\s*,\s*/g, '|')
            }

            // replace newlines in summary with <br>
            if (key === 'text' && value && value.replace) {
              obj[key] = obj[key].replace(/\n/g, '<br/>')
            }
          });

          // autoincrement id if there is no id column
          if (!obj.id) obj.id = i + 1

          // TEMPORARY: force year to 2020 since year tabs have been removed
          if (obj.year) {
            obj.year = 2020
          }

          if (isKeyed) {
            out[obj.key] = isValued ? obj.value : obj;
          } else {
            out.push(obj);
          }
        }
        var filename = `data/${sheet.properties.title.replace(/\s+/g, "_")}.sheet.json`;
        console.log(`Saving sheet to ${filename}`);
        grunt.file.write(filename, JSON.stringify(out, null, 2));
      }
    }

    done();

  });

};
