extends SceneTree

var runtime: Object


func _initialize() -> void:
	runtime = ClassDB.instantiate("XianmenRuntime")
	assert(runtime != null)
	assert(runtime.load_program(FileAccess.get_file_as_string("res://data/rules.js")), runtime.get_last_error())
	var start := send({"op": "new", "name": "原生测试"})
	assert(start["view"]["notice"]["title"] == "破庙第一夜")
	assert(start["view"]["notice"]["dialogue"].size() > 0)
	send({"op": "pick", "index": start["view"]["notice"]["options"][0]["index"]})
	send({"op": "advance"})
	var trip := send({"op": "act", "action": "exp", "args": [0, 0, 0]})
	assert(trip["view"]["ap"] == 1)
	assert(trip["view"]["notice"]["kind"] == "travel")
	var saved_trip := send({"op": "load", "save": JSON.stringify(trip["save"])})
	assert(saved_trip["view"]["notice"]["kind"] == "travel")
	var result := saved_trip
	var checked_battle := false
	for i in range(18):
		if result["view"]["notice"]["kind"] == "battle":
			for foe in result["view"]["notice"]["foes"]:
				assert(foe["hp"] <= foe["maxHp"])
			if not checked_battle:
				result = send({"op": "combat", "move": "next"})
				var progress: Dictionary = result["view"]["notice"]
				result = send({"op": "load", "save": JSON.stringify(result["save"])})
				assert(result["view"]["notice"]["kind"] == progress["kind"])
				assert(result["view"]["notice"].get("hp") == progress.get("hp"))
				assert(result["view"]["notice"].get("rage") == progress.get("rage"))
				checked_battle = true
			if result["view"]["notice"]["kind"] == "battle":
				result = send({"op": "combat", "move": "smart"})
		else:
			result = send({"op": "advance"})
		if result["view"]["notice"]["title"] == "历练归来":
			break
	assert(checked_battle)
	assert(result["view"]["notice"]["title"] == "历练归来")
	var reloaded := send({"op": "load", "save": JSON.stringify(result["save"])})
	assert(reloaded["view"]["notice"]["title"] == "历练归来")
	while reloaded["view"]["notice"] != null:
		reloaded = send({"op": "advance"})
	var season := send({"op": "season"})
	assert(season["view"]["date"] == "第 1 年 · 夏")
	assert(season["view"]["ap"] == 3)
	var code: String = send({"op": "export"})["result"]
	assert(code.begins_with("XT1."))
	var restored := send({"op": "import", "code": code})
	assert(restored["view"]["name"] == "原生测试")
	assert(restored["view"]["date"] == "第 1 年 · 夏")
	for panel in ["equipment", "arts", "market", "sect"]:
		var opened := send({"op": "panel", "panel": panel})
		assert(opened["view"]["panel"]["id"] == panel)
		assert(opened["view"]["panel"]["entries"].size() > 0)
	var realm_save: Dictionary = restored["save"]["state"]
	realm_save["p"]["r"] = 4
	realm_save["flags"]["maxR"] = 4
	realm_save["pact"] = 1
	realm_save["story"]["beat"]["c1_climax"] = 36
	realm_save["evDone"]["s1_pact_after"] = 1
	realm_save["mj"]["token"] = 1
	realm_save["onb"]["at"]["realm"] = 0
	send({"op": "load", "save": JSON.stringify(realm_save)})
	var entered := send({"op": "act", "action": "realm", "args": [false]})
	assert(entered["view"]["notice"]["kind"] == "realm")
	var resumed := send({"op": "load", "save": JSON.stringify(entered["save"])})
	assert(resumed["view"]["notice"] == entered["view"]["notice"])
	var door: Dictionary = resumed["view"]["notice"]["options"][0]
	send({"op": "realm-action", "move": door["move"], "index": door["index"]})
	realm_save["best"]["0_2"] = 3
	send({"op": "load", "save": JSON.stringify(realm_save)})
	var boss := send({"op": "act", "action": "boss", "args": {"k": 0}})
	assert(boss["view"]["notice"]["kind"] == "battle")
	var resumed_boss := send({"op": "load", "save": JSON.stringify(boss["save"])})
	assert(resumed_boss["view"]["notice"] == boss["view"]["notice"])
	var settled_boss := send({"op": "combat", "move": "smart"})
	assert(settled_boss["view"]["ap"] == 2)
	assert(settled_boss["view"]["notice"]["title"] == "首领战")

	var late_save: Dictionary = realm_save.duplicate(true)
	late_save["p"].merge({"r": 1, "s": 3, "xp": 1e9}, true)
	late_save["pills"] = 4
	late_save["flags"]["sureBt"] = 1
	var ready := settle_cards(send({"op": "load", "save": late_save}))
	assert(ready["view"]["canBreak"])
	var prepared := send({"op": "break"})
	assert(prepared["view"]["notice"]["kind"] == "breakthrough")
	var started := send({"op": "breakthrough", "move": "confirm"})
	assert(started["view"]["notice"]["active"])
	var resumed_trib := send({"op": "load", "save": started["save"]})
	assert(resumed_trib["view"]["notice"] == started["view"]["notice"])
	assert(resumed_trib["save"]["state"]["trib"]["cur"] == started["save"]["state"]["trib"]["cur"])
	var finished := send({"op": "breakthrough", "move": "confirm"})
	assert(finished["save"]["state"]["p"]["r"] == 2)
	assert(finished["save"]["state"]["pills"] == 4)

	late_save["p"].merge({"r": 0, "s": 0, "xp": 0, "age": 100000}, true)
	var death := settle_cards(send({"op": "load", "save": late_save}))
	assert(death["view"]["notice"]["title"] == "坐化")
	var hall := send({"op": "life", "move": "settle"})
	assert(hall["view"]["notice"]["kind"] == "rebirth")
	var resumed_hall := send({"op": "load", "save": hall["save"]})
	assert(resumed_hall["view"]["notice"] == hall["view"]["notice"])
	var next_life := send({"op": "life", "move": "begin"})
	assert(next_life["save"]["state"]["rebirth"] == 1)
	assert(next_life["save"]["state"]["meta"]["lifeN"] == 1)
	assert(next_life["save"]["state"]["p"]["r"] == 0)

	late_save["p"].merge({"r": 9, "age": 100}, true)
	late_save["eflags"]["elder_kept"] = 1
	var ending := settle_cards(send({"op": "load", "save": late_save}), {"s9_gate": 1})
	assert(ending["view"]["notice"]["mode"] == "ascend")
	assert(ending["save"]["state"]["eflags"]["asc_stay"])
	var stayed := send({"op": "life", "move": "return"})
	assert(stayed["view"]["canReturnToGate"])
	var second_gate := send({"op": "life", "move": "gate"})
	assert(second_gate["view"]["notice"]["key"] == "s9_gate_again")
	var second_ending := settle_cards(second_gate, {"s9_gate_again": 0})
	assert(second_ending["view"]["notice"]["mode"] == "ascend")
	assert(second_ending["save"]["state"]["eflags"]["asc_go"])
	assert(not second_ending["save"]["state"]["eflags"].has("asc_stay"))
	print("Godot native runtime: story, combat, seasons, management, realm, tribulation, rebirth and save roundtrips passed")
	quit()


func settle_cards(response: Dictionary, picks := {}) -> Dictionary:
	for i in range(30):
		var notice = response["view"]["notice"]
		if notice == null:
			break
		if notice["kind"] == "choice":
			var available: Array = notice["options"].filter(func(option): return option["available"])
			assert(not available.is_empty())
			response = send({"op": "pick", "index": picks.get(notice["key"], available[0]["index"])})
		elif notice["kind"] == "card":
			response = send({"op": "advance"})
		else:
			break
	return response


func send(message: Dictionary) -> Dictionary:
	var response = JSON.parse_string(runtime.request(JSON.stringify(message, "", false, true)))
	assert(response is Dictionary, runtime.get_last_error())
	assert(response["ok"], response.get("error", "Unknown runtime error"))
	return response
