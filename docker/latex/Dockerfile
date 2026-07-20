FROM texlive/texlive:latest-full

RUN mkdir -p /work && chmod 777 /work

WORKDIR /work

COPY compile_server.py /compile_server.py

EXPOSE 9777

CMD ["python3", "/compile_server.py"]
