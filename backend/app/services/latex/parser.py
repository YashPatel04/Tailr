import re
from dataclasses import dataclass, field


@dataclass
class Token:
    type: str
    start_byte: int
    end_byte: int
    content: str = ""
    name: str = ""
    children: list["Token"] = field(default_factory=list)

    def walk(self):
        """Yield all tokens in pre-order."""
        yield self
        for child in self.children:
            yield from child.walk()

    @property
    def label(self) -> str:
        return f"{self.type}:{self.name}" if self.name else self.type


TOKEN_PATTERN = re.compile(
    r"""
    (?P<comment>%.*?$)
    |(?P<verbatim_env>\\begin\{verbatim\}.*?\\end\{verbatim\})
    |(?P<display_math>\\\[.*?\\\]|\\begin\{equation\}.*?\\end\{equation\})
    |(?P<inline_math>\$[^$]*?\$)
    |(?P<verb_text>\\verb[|!@#][^|!@#]*?[|!@#])
    |(?P<command>\\(?:[a-zA-Z@]+|.))(?:\s*\[[^\]]*\])?(?:\s*\{[^}]*\})*
    |(?P<begin_env>\\begin\{([a-zA-Z]+)\})
    |(?P<end_env>\\end\{([a-zA-Z]+)\})
    |(?P<group>\{[^}]*\})
    |(?P<text>[^\\%\{\}\$]+)
    |(?P<blank>\s+)
    """,
    re.DOTALL | re.VERBOSE | re.MULTILINE,
)


class LatexParser:
    def parse(self, source: bytes) -> Token:
        text = source.decode("utf-8", errors="replace")
        root = Token(type="root", start_byte=0, end_byte=len(source))
        stack: list[Token] = [root]

        for match in TOKEN_PATTERN.finditer(text):
            kind = match.lastgroup
            if kind is None:
                continue

            start = match.start()
            end = match.end()
            value = match.group(0)

            if kind == "comment":
                stack[-1].children.append(
                    Token(type="comment", start_byte=start, end_byte=end, content=value)
                )
            elif kind == "verbatim_env":
                stack[-1].children.append(
                    Token(type="verbatim", start_byte=start, end_byte=end, content=value)
                )
            elif kind == "display_math":
                stack[-1].children.append(
                    Token(type="math", start_byte=start, end_byte=end, content=value)
                )
            elif kind == "inline_math":
                stack[-1].children.append(
                    Token(type="math", start_byte=start, end_byte=end, content=value)
                )
            elif kind == "verb_text":
                stack[-1].children.append(
                    Token(type="verbatim", start_byte=start, end_byte=end, content=value)
                )
            elif kind == "command":
                name = re.match(r"\\([a-zA-Z@]+|.)", value)
                cmd_name = name.group(1) if name else ""
                cmd_token = Token(
                    type="command", start_byte=start, end_byte=end, name=cmd_name, content=value
                )
                stack[-1].children.append(cmd_token)
            elif kind == "begin_env":
                env_name = re.search(r"\\begin\{([a-zA-Z]+)\}", value)
                env_name_str = env_name.group(1) if env_name else ""
                env_token = Token(
                    type="environment",
                    start_byte=start,
                    end_byte=end,
                    name=env_name_str,
                    content=value,
                )
                stack[-1].children.append(env_token)
                stack.append(env_token)
            elif kind == "end_env":
                if len(stack) > 1 and stack[-1].type == "environment":
                    stack[-1].end_byte = end
                    stack[-1].content += value
                    stack.pop()
                else:
                    stack[-1].children.append(
                        Token(type="text", start_byte=start, end_byte=end, content=value)
                    )
            elif kind == "group":
                stack[-1].children.append(
                    Token(type="group", start_byte=start, end_byte=end, content=value)
                )
            elif kind == "text":
                trimmed = value.strip()
                if trimmed:
                    stack[-1].children.append(
                        Token(type="text", start_byte=start, end_byte=end, content=trimmed)
                    )
            elif kind == "blank":
                pass

        root.source = source
        return root
