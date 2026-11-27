extends VBoxContainer

signal completed
signal music_cue(track: String)
signal sound_cue(effect: String)

const SOUND_NAMES := {"win": "victory", "reveal": "reveal_4"}

var clip: Dictionary
var player: VideoStreamPlayer
var subtitle: Label
var cue_index := 0
var watched := false


func _ready() -> void:
	var resource_path := "res://cinematics/" + String(clip["asset"]) + ".ogv"
	if not ResourceLoader.exists(resource_path):
		finish.call_deferred()
		return
	var theater := AspectRatioContainer.new()
	theater.ratio = 5.0 / 3.0
	theater.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	theater.custom_minimum_size.y = 222
	add_child(theater)
	player = VideoStreamPlayer.new()
	player.expand = true
	player.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	player.stream = load(resource_path) as VideoStream
	player.finished.connect(finish)
	theater.add_child(player)

	subtitle = Label.new()
	subtitle.custom_minimum_size.y = 52
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	subtitle.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	subtitle.add_theme_font_size_override("font_size", 20)
	add_child(subtitle)

	var skip := Button.new()
	skip.text = "跳过过场"
	skip.custom_minimum_size.y = 48
	skip.pressed.connect(finish)
	add_child(skip)
	if player.stream == null:
		finish.call_deferred()
		return
	music_cue.emit(String(clip.get("music", "")))
	player.play()


func _process(_delta: float) -> void:
	if not is_instance_valid(player) or watched:
		return
	var time := player.stream_position
	var cues: Array = clip.get("cues", [])
	while cue_index < cues.size() and float(cues[cue_index][0]) <= time:
		var name := String(cues[cue_index][1])
		cue_index += 1
		if name.begins_with("~bgm:"):
			music_cue.emit(name.trim_prefix("~bgm:"))
		else:
			sound_cue.emit(SOUND_NAMES.get(name, name))
	var caption := ""
	for segment in clip.get("subtitles", []):
		if time >= float(segment[0]) and time < float(segment[1]):
			caption = String(segment[2]).left(floori((time - float(segment[0])) / 0.045) + 1)
			break
	if caption != subtitle.text:
		subtitle.text = caption


func finish() -> void:
	if watched:
		return
	watched = true
	if is_instance_valid(player):
		player.stop()
	completed.emit()
