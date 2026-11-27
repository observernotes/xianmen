#include <chrono>
#include <memory>

#include <godot_cpp/classes/ref_counted.hpp>
#include <godot_cpp/core/class_db.hpp>
#include <godot_cpp/godot.hpp>
#include <quickjs.h>

using namespace godot;

namespace {

struct RuntimeDeleter {
    void operator()(JSRuntime *runtime) const { JS_FreeRuntime(runtime); }
};
struct ContextDeleter {
    void operator()(JSContext *context) const { JS_FreeContext(context); }
};

class XianmenRuntime : public RefCounted {
    GDCLASS(XianmenRuntime, RefCounted)

    using Clock = std::chrono::steady_clock;
    Clock::time_point deadline;
    std::unique_ptr<JSRuntime, RuntimeDeleter> runtime;
    std::unique_ptr<JSContext, ContextDeleter> context;
    String last_error;

    static int interrupt(JSRuntime *, void *opaque) {
        const auto *engine = static_cast<const XianmenRuntime *>(opaque);
        return Clock::now() >= engine->deadline;
    }

    void read_exception() {
        JSValue error = JS_GetException(context.get());
        const char *message = JS_ToCString(context.get(), error);
        last_error = message ? String::utf8(message) : String("JavaScript exception");
        if (message) JS_FreeCString(context.get(), message);
        JS_FreeValue(context.get(), error);
    }

protected:
    static void _bind_methods() {
        ClassDB::bind_method(D_METHOD("load_program", "source"), &XianmenRuntime::load_program);
        ClassDB::bind_method(D_METHOD("request", "payload"), &XianmenRuntime::request);
        ClassDB::bind_method(D_METHOD("get_last_error"), &XianmenRuntime::get_last_error);
    }

public:
    bool load_program(const String &source) {
        context.reset();
        runtime.reset(JS_NewRuntime());
        last_error = "Could not start the rules runtime";
        if (!runtime) return false;
        JS_SetMemoryLimit(runtime.get(), 128 * 1024 * 1024);
        JS_SetMaxStackSize(runtime.get(), 1024 * 1024);
        JS_SetInterruptHandler(runtime.get(), interrupt, this);
        context.reset(JS_NewContext(runtime.get()));
        if (!context) return false;

        const CharString input = source.utf8();
        deadline = Clock::now() + std::chrono::seconds(5);
        JSValue result = JS_Eval(context.get(), input.get_data(), input.length(), "rules.js", JS_EVAL_TYPE_GLOBAL);
        const bool ok = !JS_IsException(result);
        if (ok) last_error = String();
        else read_exception();
        JS_FreeValue(context.get(), result);
        return ok;
    }

    String request(const String &payload) {
        if (!context) return String();
        last_error = String();
        deadline = Clock::now() + std::chrono::seconds(2);
        const CharString input = payload.utf8();
        JSContext *ctx = context.get();
        JSValue global = JS_GetGlobalObject(ctx);
        JSValue callback = JS_GetPropertyStr(ctx, global, "xianmenRequest");
        JSValue argument = JS_NewStringLen(ctx, input.get_data(), input.length());
        JSValue result = JS_Call(ctx, callback, JS_UNDEFINED, 1, &argument);
        String output;
        if (JS_IsException(result)) {
            read_exception();
        } else if (const char *value = JS_ToCString(ctx, result)) {
            output = String::utf8(value);
            JS_FreeCString(ctx, value);
        } else {
            read_exception();
        }
        JS_FreeValue(ctx, result);
        JS_FreeValue(ctx, argument);
        JS_FreeValue(ctx, callback);
        JS_FreeValue(ctx, global);
        return output;
    }

    String get_last_error() const { return last_error; }
};

} // namespace

extern "C" GDExtensionBool GDE_EXPORT xianmen_runtime_init(
        GDExtensionInterfaceGetProcAddress address, GDExtensionClassLibraryPtr library,
        GDExtensionInitialization *initialization) {
    GDExtensionBinding::InitObject init(address, library, initialization);
    init.register_initializer([](ModuleInitializationLevel level) {
        if (level == MODULE_INITIALIZATION_LEVEL_SCENE) GDREGISTER_CLASS(XianmenRuntime);
    });
    init.register_terminator([](ModuleInitializationLevel) {});
    init.set_minimum_library_initialization_level(MODULE_INITIALIZATION_LEVEL_SCENE);
    return init.init();
}
