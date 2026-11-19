from mcp.server.fastmcp import FastMCP

import tools

server = FastMCP(
    "hackathon",
    instructions=(
        "Outils du hackathon DuploJS vers Go. `search` donne un échantillon par le sens ; "
        "`api_list`, `signatures`, `usages` et `coverage` donnent des inventaires exhaustifs. "
        "Pour savoir si tout est géré, partir des inventaires, pas de la recherche."
    ),
)

for function in tools.TOOLS_EXPOSED:
    server.tool()(function)

if __name__ == "__main__":
    server.run()
