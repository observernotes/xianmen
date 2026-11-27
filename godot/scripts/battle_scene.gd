extends Control

const LANDSCAPES := preload("res://art/combat-landscapes.png")
const ACTORS := preload("res://art/combat-actors.png")
const HERO_POSES := preload("res://art/duel-actors.png")
const EFFECTS := preload("res://art/combat-effects.png")
const FONT := preload("res://art/fusion-pixel.ttf")
const ATLAS_PATH := "res://art/combat-index.json"
const ELEMENTS := {
	"jin": Color("#fff194"), "mu": Color("#a9f28a"), "shui": Color("#8ee6ff"),
	"huo": Color("#ff835d"), "tu": Color("#e9ae71"),
}
const LOGICAL_SIZE := Vector2(200.0, 160.0)
const SCENE_HEIGHT := 224.0
const PLAYER_X := 56.0
const FEET := 128.0
const BACK_PANEL := Color("#211932")
const GOLD := Color("#ffe39a")
const JADE := Color("#8ff5d0")
const RED := Color("#ff8b79")

static var atlas: Dictionary = {}
static var skill_icons: Dictionary = {}

var combat: Dictionary = {}
var playback_speed := 1
var elapsed := 0.0
var effects_until := 0.0
var paused := false
var foes: Array = []
var walking := false
var player_attack := false
var player_hit := false
var heavy_attack := false
var ultimate_attack := false
var foe_pos: Dictionary = {}
var foe_hit_at: Dictionary = {}
var foe_attack_at: Dictionary = {}
var stages: Array[Dictionary] = []


func _ready() -> void:
	load_atlas()
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	clip_contents = true
	custom_minimum_size.y = 265
	resized.connect(fit_scene)
	fit_scene()
	walking = combat.get("kind") == "travel"
	foes = combat.get("foes", [])
	var count := maxi(1, int(combat.get("foeCount", foes.size())))
	var names := PackedStringArray()
	var accessible_location := String(combat.get("location", combat.get("title", "")))
	if not accessible_location.is_empty():
		names.append(accessible_location)
	for foe in foes:
		var index := int(foe["index"])
		foe_pos[index] = 134.0 + 32.0 * index - (22.0 if count > 2 else 0.0)
		var shield := int(foe.get("shield", 0))
		var charge := " · 蓄力" if foe.get("charge", false) else ""
		names.append("%s %d/%d%s%s" % [foe["name"], foe["hp"], foe["maxHp"],
			" · 护罩 %d 格" % shield if shield > 0 else "", charge])
	if combat.has("hint"):
		names.append(combat["hint"])
	accessibility_name = "，".join(names)
	prepare_effects()


func fit_scene() -> void:
	if size.x > 0.0:
		custom_minimum_size.y = clampf(floorf(size.x * LOGICAL_SIZE.y / LOGICAL_SIZE.x), 220.0, 330.0)
	queue_redraw()


static func load_atlas() -> void:
	if atlas.is_empty():
		var data = JSON.parse_string(FileAccess.get_file_as_string(ATLAS_PATH))
		if data is Dictionary:
			atlas = data


static func actor_frame(index: int) -> Rect2:
	return Rect2((index % 8) * 96, (index >> 3) * 48, 96, 48)


static func hero_frame(hero: int, pose: int) -> Rect2:
	return actor_frame(int(atlas["heroes"][hero][pose]))


static func skill_texture(kind: String, element: String) -> Texture2D:
	load_atlas()
	var key := "skill:" + kind + ":" + element
	if not skill_icons.has(key):
		var cell: Array = atlas.get("effects", {}).get(key, [])
		if cell.is_empty():
			return null
		var texture := AtlasTexture.new()
		texture.atlas = EFFECTS
		texture.region = Rect2(cell[0], cell[1], cell[2], cell[3])
		texture.filter_clip = true
		skill_icons[key] = texture
	return skill_icons[key]


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED:
		paused = true
	elif what == NOTIFICATION_APPLICATION_RESUMED:
		paused = false


func _process(delta: float) -> void:
	if paused:
		return
	var previous := elapsed
	elapsed += minf(delta, 0.1) * playback_speed
	if walking or previous < effects_until or int(previous / 0.42) != int(elapsed / 0.42):
		queue_redraw()


func prepare_effects() -> void:
	var sequence: Dictionary = {}
	for effect in combat.get("effects", []):
		var target := int(effect["target"])
		var source := int(effect.get("source", -1))
		var kind := String(effect["kind"])
		var marker := ""
		var frame_key := ""
		var when := 0.15
		var tint: Color = ELEMENTS.get(effect.get("el"), GOLD)
		match kind:
			"skill":
				player_attack = true
				var art := String(effect.get("fx", ""))
				frame_key = "ult" if art == "ult" else "effect:" + (art if not art.is_empty() else "slash") + ":" + String(effect.get("el", ""))
			"ult":
				player_attack = true
				ultimate_attack = true
				frame_key = "ult"
				when = 0.0
			"hit":
				player_attack = true
			"heavy", "fhit":
				heavy_attack = heavy_attack or kind == "heavy"
				player_hit = true
				when = 0.29 + sequence.get(target, 0) * 0.06
				foe_attack_at[source] = when
				tint = RED
			"break":
				marker = "罩碎"
				frame_key = "effect:brk:"
				tint = Color("#9cecfc")
				when = 0.24
			"brk":
				marker = "破招"
				when = 0.44
			"ke", "beike":
				marker = "克" if kind == "ke" else "打不动"
				tint = GOLD if kind == "ke" else Color("#d2c7e0")
				when = 0.28
			"chain":
				marker = "连携"
				frame_key = "effect:chain:" + String(effect.get("el", ""))
				tint = JADE
			"charge":
				marker = String(effect.get("name", "蓄力！"))
				tint = RED
				when = 0.28
			"pill", "heal":
				tint = JADE
				when = 0.06
			"dot":
				tint = Color("#ff9a4a")
			_:
				continue
		if kind in ["hit", "skill", "ult", "dot"]:
			foe_hit_at[target] = when + (0.33 if kind == "ult" else 0.0)
		var amount := String(effect.get("amount", ""))
		if not amount.is_empty():
			if kind in ["fhit", "heavy"]:
				amount = "−" + amount
			elif kind in ["heal", "pill"]:
				amount = "+" + amount
			elif effect.get("critical", false):
				amount = "暴 " + amount
				tint = GOLD
		var order := int(sequence.get(target, 0))
		sequence[target] = order + 1
		effects_until = maxf(effects_until, when + 0.70)
		stages.append({
			"kind": kind, "x": foe_pos.get(target, PLAYER_X), "time": when,
			"label": marker if not marker.is_empty() else amount, "tint": tint,
			"row": order, "frames": frame_key,
		})


func _draw() -> void:
	var factor := minf(size.x / LOGICAL_SIZE.x, size.y / LOGICAL_SIZE.y)
	if factor <= 0:
		return
	var sky := maxf(0.0, floorf(size.y / factor - LOGICAL_SIZE.y))
	var origin := (size - LOGICAL_SIZE * factor) * 0.5 + Vector2(0.0, sky * factor * 0.5)
	var window := Rect2(0, -sky, LOGICAL_SIZE.x, LOGICAL_SIZE.y + sky)
	draw_rect(Rect2(Vector2.ZERO, size), BACK_PANEL)
	draw_set_transform(origin, 0.0, Vector2.ONE * factor)
	var terrain := int(combat.get("region", 0)) * SCENE_HEIGHT + SCENE_HEIGHT - LOGICAL_SIZE.y
	draw_texture_rect_region(LANDSCAPES, Rect2(Vector2.ZERO, LOGICAL_SIZE),
		Rect2(0, terrain, LOGICAL_SIZE.x, LOGICAL_SIZE.y))
	if sky > 0.0:
		var source_height := minf(sky, SCENE_HEIGHT - LOGICAL_SIZE.y)
		draw_texture_rect_region(LANDSCAPES, Rect2(0, -sky, LOGICAL_SIZE.x, sky),
			Rect2(0, terrain - source_height, LOGICAL_SIZE.x, source_height))
	if atlas.is_empty():
		return
	if (ultimate_attack and elapsed > 0.30 and elapsed < 0.41) or (heavy_attack and elapsed >= 0.29 and elapsed < 0.38):
		draw_rect(window,
			Color(1.0, 0.87, 0.57, 0.25) if ultimate_attack else Color(0.94, 0.26, 0.21, 0.18))
	var idle := int(elapsed / 0.42) % 2
	draw_player(idle)
	for foe in foes:
		draw_foe(foe, idle)
	for effect in stages:
		draw_effect(effect)
	draw_headers(-sky)
	draw_path()
	var hint := String(combat.get("hint", ""))
	if not hint.is_empty():
		draw_caption(hint, LOGICAL_SIZE.x * 0.5, 55.0 - sky, GOLD, true)
	draw_rect(window.grow(-0.5), Color("#72634d"), false)


func draw_player(idle: int) -> void:
	var x := PLAYER_X
	var pose := idle
	if not walking and int(combat.get("hp", 1)) <= 0:
		pose = 5
	elif player_attack and elapsed < 0.34:
		pose = 2 if elapsed < 0.11 else 3
		x += -3.0 if pose == 2 else roundf(18.0 * sin(PI * (elapsed - 0.11) / 0.23))
	elif player_hit and elapsed >= 0.29 and elapsed < 0.55:
		pose = 4
		x -= 4.0
	elif walking:
		x += roundf(3.0 * sin(elapsed * 5.2))
	var frame := clampi(int(combat.get("hero", 0)), 0, 19) * 6 + pose
	draw_texture_rect_region(HERO_POSES, Rect2(x - 24, FEET - 46, 48, 48),
		Rect2((frame % 16) * 48, (frame >> 4) * 48, 48, 48))


func draw_foe(foe: Dictionary, idle: int) -> void:
	var index := int(foe["index"])
	var x := float(foe_pos[index])
	var down := float(foe["hp"]) <= 0
	var hit_time := float(foe_hit_at.get(index, 0.0))
	if down and elapsed - hit_time >= 0.5:
		return
	var phase := elapsed - float(foe_attack_at.get(index, -1.0))
	if phase >= 0.0 and phase <= 0.34:
		x -= roundf(13.0 * sin(PI * phase / 0.34))
	var element := String(foe.get("element", ""))
	if foe.get("aura", false) and not down:
		stamp_effect("aura:" + element, idle, Vector2(x - 20, FEET - 4))
	var tint := Color.WHITE
	if down:
		tint.a = 1.0 - clampf((elapsed - hit_time) / 0.5, 0.0, 1.0)
	elif foe_hit_at.has(index) and elapsed >= hit_time and elapsed - hit_time < 0.16:
		tint = Color(1.0, 0.82, 0.69, 0.7) if int(elapsed * 26.0) % 2 == 0 else Color.WHITE
	elif foe.get("charge", false) and idle == 1:
		tint = RED
	var sources: Array = atlas["foes"].get(foe["id"], atlas["foes"]["yelang"])
	var lift := 1.0 if foe.get("charge", false) and idle == 1 else 0.0
	draw_texture_rect_region(ACTORS, Rect2(x - 48, FEET - 46 - lift, 96, 48), actor_frame(int(sources[idle])), tint)
	if not down:
		draw_foe_status(foe, x, element)


func draw_foe_status(foe: Dictionary, x: float, element: String) -> void:
	var elite: bool = foe.get("elite", false)
	var width := 25.0 if foes.size() > 1 else 32.0
	var top := FEET - (51.0 if elite else 40.0)
	var bar := Rect2(roundf(x - width * 0.5), top, width, 3.0)
	var health := clampf(float(foe["hp"]) / maxf(1.0, float(foe["maxHp"])), 0.0, 1.0)
	var fill := roundf(bar.size.x * health)
	draw_rect(bar.grow(1.0), Color("#201428"))
	draw_rect(bar, Color("#562a3e"))
	if fill > 0.0:
		draw_rect(Rect2(bar.position, Vector2(fill, bar.size.y)), RED if elite else Color("#e26c60"))
		draw_rect(Rect2(bar.position, Vector2(fill, 1.0)), Color("#ffc5a9"))
		stamp_effect("badge:" + element, 0, bar.position + Vector2(-10, -3))
	var shield := int(foe.get("shield", 0))
	var shield_max := int(foe.get("shieldMax", shield))
	var shield_left := roundf(x - (shield_max * 8.0 - 1.0) * 0.5)
	for pip in shield_max:
		stamp_effect("shield", int(pip < shield), Vector2(shield_left + pip * 8, top - 10))
	if foe.get("charge", false):
		draw_caption("!", x + width * 0.5 + 4.0, top - 3.0, RED)


func draw_effect(effect: Dictionary) -> void:
	var phase := elapsed - float(effect["time"])
	if phase < 0.0 or phase > 0.70:
		return
	var x := float(effect["x"])
	var key := String(effect["frames"])
	var kind := String(effect["kind"])
	if key == "ult" and phase < 0.66:
		stamp_effect(key, int(phase / 0.11), Vector2(x - 32, FEET - 92))
	elif not key.is_empty() and phase < 0.36:
		stamp_effect(key, int(phase / 0.09), Vector2(x - 24, FEET - 44))
	elif kind in ["hit", "heavy"] and phase < 0.19:
		var streak := Color("#fff6ce") if kind == "hit" else RED
		streak.a = 1.0 - phase / 0.19
		var center := Vector2(x + phase * 28.0, FEET - 24.0)
		draw_line(center + Vector2(-9, 4), center + Vector2(10, -5), streak, 2.0)
	var label := String(effect["label"])
	var label_phase := phase - (0.32 if kind == "ult" else 0.0)
	if label.is_empty() or label_phase < 0.0:
		return
	var tint := Color(effect["tint"])
	tint.a = clampf((0.64 - label_phase) / 0.24, 0.0, 1.0)
	var row := int(effect["row"])
	var offset := 8.0 if row % 2 == 1 else -6.0
	draw_caption(label, x + offset * row, FEET - 40.0 - row * 11.0 - label_phase * 24.0, tint)


func stamp_effect(key: String, frame: int, at: Vector2) -> void:
	var cell: Array = atlas.get("effects", {}).get(key, [])
	if not cell.is_empty():
		var dimensions := Vector2(cell[2], cell[3])
		var source := Vector2(float(cell[0]) + mini(frame, int(cell[4]) - 1) * dimensions.x, cell[1])
		draw_texture_rect_region(EFFECTS, Rect2(at.round(), dimensions), Rect2(source, dimensions))


func draw_headers(top: float) -> void:
	var place := String(combat.get("location", combat.get("title", "")))
	if not place.is_empty():
		draw_caption(place, 4.0 + measure(place, 8) * 0.5 + 3.0, top + 12.0, GOLD, true, 8)
	if not walking:
		var text := "第 %d 轮" % int(combat.get("round", 1))
		draw_caption(text, LOGICAL_SIZE.x - measure(text, 8) * 0.5 - 7.0, top + 12.0, Color("#efe2c4"), true, 8)
		for foe in foes:
			if foe.get("elite", false):
				var name := String(foe["name"])
				draw_caption(name, LOGICAL_SIZE.x - measure(name, 8) * 0.5 - 7.0, top + 25.0, RED, true, 8)
				break


func draw_path() -> void:
	var trip = combat.get("trip")
	if not trip is Dictionary or int(trip["total"]) <= 0:
		return
	var left := 50.0
	var width := 100.0 / int(trip["total"])
	var done := int(trip["done"])
	draw_rect(Rect2(left, 150, 100, 7), Color("#211932"))
	for step in int(trip["total"]):
		var tint := JADE if step < done else GOLD if step == done else Color("#574763")
		var x := roundf(left + width * step) + 1.0
		draw_rect(Rect2(x, 152, maxf(1.0, floorf(width) - 2.0), 3), tint)


func measure(text: String, font_size: int) -> float:
	return FONT.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x


func draw_caption(text: String, x: float, y: float, tint: Color, backing := false, font_size := 10) -> void:
	var width := measure(text, font_size)
	var start := Vector2(roundf(clampf(x - width * 0.5, 1.0, maxf(1.0, LOGICAL_SIZE.x - width - 1.0))), roundf(y))
	if backing:
		draw_rect(Rect2(start - Vector2(3, font_size - 1), Vector2(width + 6.0, font_size + 3.0)), Color(0.08, 0.06, 0.12, 0.88))
	var ink := Color(0.08, 0.06, 0.12, tint.a)
	draw_string_outline(FONT, start, text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, 2, ink)
	draw_string(FONT, start, text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, tint)
