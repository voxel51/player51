To generate optimized files: export the file from Inkscape as an optimized SVG:
    - significant digits: default 5 is fine
    - keep editor data: off
    - in SVG output: remove XML declaration, metadata, comments
    - disable viewboxing
    - disable pretty-printing
    - remove unused IDs
For CSS, urlencode the optimized file. JS snippet: prompt('', encodeURIComponent(prompt()))
