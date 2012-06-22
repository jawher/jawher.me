# This is a modified version of https://github.com/dryman/dryman.github.com/blob/src/plugins/graphviz_block.rb
# What follows is the original header

# (The MIT License)
# 
# Copyright © 2012-2013 Felix Ren-Chyan Chern
# 
# Permission is hereby granted, free of charge, to any person obtaining a copy of
# this software and associated documentation files (the ‘Software’), to deal in
# the Software without restriction, including without limitation the rights to
# use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
# of the Software, and to permit persons to whom the Software is furnished to do
# so, subject to the following conditions:
# 
# The above copyright notice and this permission notice shall be included in all
# copies or substantial portions of the Software.
# 
# THE SOFTWARE IS PROVIDED ‘AS IS’, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
# IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
# FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
# AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
# LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
# OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
# SOFTWARE.


require 'digest/md5'

GRAPHVIZ_DIR = File.expand_path('../../images/graphviz', __FILE__)
FileUtils.mkdir_p(GRAPHVIZ_DIR)

module Jekyll
  class GraphvizBlock < Liquid::Block

    def initialize(tag_name, markup, tokens)
      super
      @filename=markup.strip
      ext = File.extname(@filename)
      @format = ext[/[^\.]+/]
    end

    def render(context)
      code = super
      output_image = "#{GRAPHVIZ_DIR}/#{@filename}"
      cache_marker = File.join(GRAPHVIZ_DIR, "#{@filename}-#{Digest::MD5.hexdigest(code)}.cache")
      image_url = "/images/graphviz/#{@filename}"

      unless (File.exist?(cache_marker) and File.exist?(output_image))
        puts "dot -T#{@format} -o #{output_image}"
        IO.popen("dot -T#{@format} -o #{output_image}", 'r+') do |pipe|
          pipe.puts(code)
          pipe.close_write
          File.open(cache_marker, "w") {} # create a cache marker file

          # Since Jekyll first stores the static files list (in images for instance) and then calls
          # this graphviz generator, the generated images won't be picked up when generated for the
          # first time. 
          # In the following, we ninja-add the generated image to the static files list
          site = context.registers[:site]
          sf = StaticFile.new(site, site.source, "images/graphviz", @filename)
          site.static_files << sf
        end
      end

      "<img class='graphviz' src='#{image_url}'>"
       
    end
  end
end

Liquid::Template.register_tag('graphviz', Jekyll::GraphvizBlock)
