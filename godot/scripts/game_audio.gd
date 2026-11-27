extends Node

const SETTINGS := "user://settings.cfg"
const MODES := ["音乐与音效", "仅音效", "静音"]
const MUSIC_VOLUME := -4.0
const SILENCE := -60.0

var mode := 0
var current := ""
var active := 0
var players: Array[AudioStreamPlayer] = []
var effects: Array[AudioStreamPlayer] = []
var next_effect := 0
var fade: Tween
var resources: Dictionary = {}


func _ready() -> void:
	var config := ConfigFile.new()
	if config.load(SETTINGS) == OK:
		mode = clampi(int(config.get_value("audio", "mode", 0)), 0, MODES.size() - 1)
	for index in range(2):
		var player := AudioStreamPlayer.new()
		player.volume_db = SILENCE
		add_child(player)
		players.append(player)
	for index in range(3):
		var player := AudioStreamPlayer.new()
		add_child(player)
		effects.append(player)


func cycle_mode() -> void:
	mode = (mode + 1) % MODES.size()
	var config := ConfigFile.new()
	config.load(SETTINGS)
	config.set_value("audio", "mode", mode)
	config.save(SETTINGS)
	if mode != 0:
		music("")
	if mode == 2:
		for player in effects:
			player.stop()


func stream_for(key: String) -> AudioStream:
	if not resources.has(key):
		var path := "res://audio/" + key + ".ogg"
		resources[key] = load(path) if ResourceLoader.exists(path) else null
	return resources[key]


func music(want: String) -> void:
	if mode != 0:
		want = ""
	if want == current or players.is_empty():
		return
	var stream: AudioStreamOggVorbis = null
	if not want.is_empty():
		stream = stream_for("bgm_" + want)
		if stream == null:
			return
		stream.loop = true
	if fade:
		fade.kill()
	var previous := players[active]
	var resume_at := previous.get_playback_position() if current.begins_with("road") and want.begins_with("road") else 0.0
	current = want
	active = 1 - active
	var next := players[active]
	next.stop()
	if not stream and not previous.playing:
		return
	fade = create_tween().set_parallel()
	if previous.playing:
		fade.tween_property(previous, "volume_db", SILENCE, 0.35)
	if stream:
		next.stream = stream
		next.volume_db = -24.0
		next.play(resume_at)
		fade.tween_property(next, "volume_db", MUSIC_VOLUME, 0.35)
	if previous.playing:
		fade.chain().tween_callback(previous.stop)


func effect(key: String) -> void:
	if mode == 2 or effects.is_empty():
		return
	var stream := stream_for("sfx_" + key)
	if stream:
		var player := effects[next_effect]
		next_effect = (next_effect + 1) % effects.size()
		player.stream = stream
		player.play()
