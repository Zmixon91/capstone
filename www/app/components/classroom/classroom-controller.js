angular
	.module('Igor')
	.controller('ClassroomController', ClassroomController);

function ClassroomController($rootScope, $scope, $stateParams, $firebaseArray, $state, users, classrooms) {

	// Local Vars
	var vm = this;
	var auth = $rootScope.authData.$getAuth();
	var classId = $stateParams.classroomId;
	var myself;

	// Scoped Vars
	$scope.myTopics = $firebaseArray(new Firebase("https://igorapp.firebaseio.com/classrooms/" + classId + "/topics"));
	$scope.isStudent = true;
	vm.addTopic = addTopic;
	vm.removeTopic = removeTopic;
	vm.moveTopic = moveTopic;
	vm.startLecture = startLecture;
	vm.stopLecture = stopLecture;
	vm.respond = respond;
	vm.joinClassroom = joinClassroom;
	vm.moveTopic = moveTopic;
	vm.pullFromQueue = pullFromQueue;
	vm.responseCount = responseCount;
	vm.askQuestion = askQuestion;
	vm.addMentor = addMentor;
	vm.queuePosition = queuePosition;
	vm.removeMentor = removeMentor;

	// Load data
	load();

	// Functions

	// Check position in question Queue
	function queuePosition(x) {
		var list = $scope.myRoom.questions;
		var sorted = Object.keys(list).sort(function(a, b) {
			return list[a].time - list[b].time;
		});
		var position = sorted.indexOf(myself.id);
		return position + 1;
	}

	// Add a mentor
	function addMentor(mentor) {
		if (!$scope.myRoom.mentors) $scope.myRoom.mentors = {};
		var out;
		users.forEach(function(element) {
			if (element.id === mentor) {
				out = element;
			}
		});
		out = out || {};
		console.log(out);
		if (!out.id) return alert("Please select a Mentor");
		$scope.myRoom.mentors[out.id] = out;
		classrooms.$save($scope.myRoom);
	}

	// Remove Mentor
	function removeMentor(mentor) {
		$scope.myRoom.mentors[mentor.id] = null;
		classrooms.$save($scope.myRoom);
	}

	// Ask a question
	function askQuestion(question) {
		if (!$scope.myRoom.questions) $scope.myRoom.questions = {};
		if (!$scope.myRoom.questionsOld) $scope.myRoom.questionsOld = [];
		var out = {
			body: question,
			author: myself.email,
			time: Date.now(),
			id: myself.id
		};
		$scope.myRoom.questions[myself.id] = out;
		$scope.myRoom.questionsOld.push(out);
		classrooms.$save($scope.myRoom);
	}

	// Load data
	function load() {
		if (!auth) {
			console.log("Auth failed, please log in.");
			$state.go("login");
			return;
		}
		$scope.today = moment();
		users.$loaded().then(function(x) {
			$scope.users = users;
			users.forEach(function(element) {
				if (element.id === auth.uid) {
					myself = element;
					$scope.me = myself.id;
					console.log("User Found");
					classrooms.$loaded()
						.then(function(x) {
							classrooms.forEach(function(element) {
								if (element.$id === classId) {
									$scope.myRoom = element;
									console.log("Classroom Found");
									if (!myself.classes) myself.classes = {};
									if (myself.classes[classId]) {
										console.log("User is part of class");
										$scope.joined = true;
									}
									$scope.loaded = true;
									if (myself.id === $scope.myRoom.instructorId) $scope.isStudent = false;
								}
							}, this);
						});
				}
			}, this);
			if (!myself) console.log("User not found");
		});
	}

	// move topic from queue to track or track to queue
	function moveTopic(topic) {
		var myTopic = $scope.myTopics.$indexFor(topic);
		$scope.myTopics[myTopic].track = !$scope.myTopics[myTopic].track;
		$scope.myTopics[myTopic].lastModified = Date.now();
		$scope.myTopics.$save(myTopic);
	}

	// Add topic to track
	function addTopic(topic) {
		if (!topic) topic = {};
		topic.body = topic.body || 'EXAMPLE TOPIC BODY';
		topic.track = true;
		topic.lastModified = Date.now();
		$scope.myTopics.$add(topic);
	}

	// Removes topic from db
	function removeTopic(topic) {
		$scope.myTopics.$remove($scope.myTopics.$indexFor(topic));
	}

	// Move all items from queue to track
	function pullFromQueue() {
		var myArr = $scope.myTopics.sort(function(a, b) {
			return a.lastModified - b.lastModified;
		});
		myArr.forEach(function(topic) {
			if (!topic.track) {
				topic.track = true;
				topic.lastModified = Date.now();
				$scope.myTopics.$save(topic);
			}
		}, this);
		classrooms.$save($scope.myRoom);
	}

	// Move all itesm from track to queue
	function pullfromTrack() {
		var myArr = $scope.myTopics.sort(function(a, b) {
			return a.lastModified - b.lastModified;
		});
		myArr.forEach(function(topic) {
			if (topic.track) {
				topic.track = false;
				topic.lastModified = Date.now();
				$scope.myTopics.$save(topic);
			}
		}, this);
		classrooms.$save($scope.myRoom);
	}

	// Start lecture
	function startLecture() {
		$scope.myRoom.isLecturing = true;
		classrooms.$save($scope.myRoom);
	}

	// Stop lecture, move topics from track to queue
	function stopLecture() {
		pullfromTrack();
		$scope.myRoom.isLecturing = false;
		classrooms.$save($scope.myRoom);
	}

	// Add student response to db
	function respond(i, response) {
		if (!i.responses) i.responses = {};
		i.responses[myself.id] = response;
		$scope.myTopics.$save(i);
	}

	// Join classroom
	function joinClassroom(classroom) {
		if (classroom.instructorId === myself.id) {
			return;
		}
		console.log("joining classroom");
		if (!myself.classes) myself.classes = {};
		myself.classes[classId] = classId;
		if (!classroom.students) classroom.students = {};
		classroom.students[myself.id] = myself.id;
		users.$save(myself);
		classrooms.$save(classroom);
		$scope.joined = true;
		$state.reload();
	}

	function responseCount(topic, response) {
		var out = 0;
		if (!response) {
			if (topic.responses) out = Object.keys(topic.responses).length;
		} else {
			for (var res in topic.responses) {
				if (topic.responses[res] === response) out++;
			}
		}
		return out;
	}

}