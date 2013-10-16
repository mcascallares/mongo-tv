var mongoose = require('mongoose'),
    Schema = mongoose.Schema,
    _ = require('underscore'),
    episode = require('./episode'),
    Subtitle = require('./subtitle').Subtitle;


var showSchema = new Schema({
    name: { type: String, required: true},
    episodes: [
        {
            season: Number,
            number: Number,
            video: String,
            created: Date
        }
    ]
});


showSchema.index({ 'name' : 1}, { '_id' : 1}); // covered queries when retrieving show names
showSchema.index({ 'updated' : 1});
showSchema.index({ 'episodes._id' : 1});
showSchema.index({ 'episodes.season' : 1, 'episodes.number': 1});


showSchema.statics.listNames = function(callback) {
    this.find({}, '_id name').sort('name').exec(callback);
};


showSchema.methods.getEpisode = function(season, number) {
    var result = _.find(this.episodes, function(obj) {
        return obj.season == season && obj.number == number;
    });
    return result ? result : null;
};


showSchema.methods.addEpisode = function(season, number, videoPath, subtitlePath, callback) {
    if (this.getEpisode(season, number)) {
        throw new Error('That episode is already in the system');
    }

    var _this = this;
    var filename = this._id + '_' + season + '_' + number;
    episode.save(videoPath, filename, function() {
        console.log('Succesfully saved the video, adding metadata to the show');
        var newEpisode = {
            created: new Date(),
            season: season,
            number: number,
            video: filename
        };
        _this.episodes.push(newEpisode);
        _this.save(function(err, savedShow) {
            if (err) {
                throw new Error('An error occurred when saving show metadata');
            }

            console.log('Succesfully saved show metadata, adding subtitle');

            var inserted = savedShow.getEpisode(season, number);
            console.log(inserted);

            subtitle = new Subtitle({ episode: inserted._id});
            subtitle.parseContent(subtitlePath);
            console.log('presave');
            console.log(subtitle);
            subtitle.save(function(err, data) {
                if (err) {
                    throw new Error('An error occurred when saving the subtitle');
                }
                callback(savedShow);
            });
        });
    });
};


exports.Show = mongoose.model('Show', showSchema, 'shows');