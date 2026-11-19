import inspect
import json
import sys

import tools

available = {function.__name__: function for function in tools.TOOLS_EXPOSED}

if len(sys.argv) < 2 or sys.argv[1] not in available:
    for name, function in available.items():
        print(f"{name}{inspect.signature(function)}\n    {inspect.getdoc(function).splitlines()[0]}")
    sys.exit(0 if len(sys.argv) < 2 else 1)

function = available[sys.argv[1]]
parameters = inspect.signature(function).parameters
arguments = {}
for position, raw in enumerate(sys.argv[2:]):
    key, value = raw.split("=", 1) if "=" in raw and raw.split("=", 1)[0] in parameters else (list(parameters)[position], raw)
    kind = parameters[key].annotation
    arguments[key] = value.lower() in {"1", "true", "oui"} if kind is bool else kind(value)

print(json.dumps(function(**arguments), ensure_ascii=False, indent=1))
