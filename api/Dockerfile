FROM python:3.7
RUN apt-get update
RUN mkdir /api
COPY . /api
WORKDIR /api
RUN pip install -r requirements.txt
ENV FLASK_ENV="docker"
ENV FLASK_APP="main"
EXPOSE 5000 3006

# CMD ["flask", "run"]
