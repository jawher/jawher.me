date: 2016-01-02
slug: reverse-engineering-arm1
url: http://www.righto.com/2015/12/reverse-engineering-arm1-ancestor-of.html
title: Reverse engineering the ARM1

<img src="https://lh3.googleusercontent.com/-Um9o8x0OulQ/VoFj0Mq2MqI/AAAAAAAAyPk/2twW9hihUvw/w500/chip-labeled.png" width="300" />

> The ARM1 chip is built from functional blocks, each with a different purpose. Registers store data, the ALU (arithmetic-logic unit) performs simple arithmetic, instruction decoders determine how to handle each instruction, and so forth. Compared to most processors, the layout of the chip is simple, with each functional block clearly visible. (In comparison, the layout of chips such as the 6502 or Z-80 is highly hand-optimized to avoid any wasted space. In these chips, the functional blocks are squished together, making it harder to pick out the pieces.)