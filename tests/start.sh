PRV_DIR=$(pwd)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $DIR

if [ ! -d testrepo ]; then
  rm -rf testrepo
  git clone https://github.com/danielsiwiec/todo-backend-restify-redux.git testrepo
  cd testrepo
  git checkout 969a376
  npm install
fi

rsync -a testjson/ testrepo/

$DIR/testrepo/node_modules/.bin/babel-node $DIR/../bin/allrounder $@ -s testrepo

cd $PRV_DIR
