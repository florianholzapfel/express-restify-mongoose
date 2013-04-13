/**
 * todos.js
 *
 * based on the angularjs todo sample
 *
 **/

function TodoCtrl($scope, $http) {
	$scope.addTodo = function() {
		var todo = {
			text: $scope.todoText
		};
		$scope.todoText = '';

		$http.put('/api/v1/todos', todo, {
			headers: {
				'Content-Type': 'application/json'
			}
		}).success(function(data) {
			$scope.todos.push(todo);
		});
	};
	$scope.remaining = function() {
		var count = 0;
		angular.forEach($scope.todos, function(todo) {
			count += todo.done ? 0 : 1;
		});
		return count;
	};
	$scope.save = function(item) {
		$http.put('/api/v1/todos/' + item._id, {
			done: item.done
		}, {
			headers: {
				'Content-Type': 'application/json'
			}
		}).success(function(data) {
		});
	};
	$scope.archive = function() {
		var oldTodos = $scope.todos;
		$scope.todos = [];
		angular.forEach(oldTodos, function(todo) {
			if(!todo.done) {
				$scope.todos.push(todo);
			}
		});
		$http.delete('/api/v1/todos/?done=true');
	};

	$http.get('/api/v1/todos').success(function(data) {
		$scope.todos = data;
	});
}
