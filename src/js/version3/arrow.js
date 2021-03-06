function ArrowV3(dna){
	this.thefittest = false;
	this.completed = false;
	this.crashed = false;
	this.targ_ind = 0;
	this.pos = createVector(210*width/2100, 90*height/370);
	this.vel = createVector();
	this.acc = createVector();
	if(dna){
		this.dna = dna;
	}
	else{
		this.dna = new DNAV3();
	}
	this.fitness = 0;
	this.sensors = [new SensorV3(60,sensor_length), new SensorV3(30,sensor_length),
		new SensorV3(0,sensor_length), new SensorV3(330,sensor_length), new SensorV3(300,sensor_length)];
	this.sensor_results = [];
	this.measured_distances = [];
	this.old_pos = [this.pos.x, this.pos.y];

	this.calcFitness = function(){
		var best_d = dist(this.pos.x,this.pos.y,targets[this.targ_ind][0][0],targets[this.targ_ind][0][1]);
		for(var i = 0; i < targets[this.targ_ind].length; i++){
			var disti = dist(this.pos.x,this.pos.y,targets[this.targ_ind][i][0],targets[this.targ_ind][i][1]);
			if(best_d > disti){
				best_d = disti;
			}
		}
		this.fitness = 1 / (best_d * best_d);
		this.fitness += this.targ_ind;
		if(this.completed){
			this.fitness += 1;
		}
	}

	this.applyForce = function(force){
		this.acc.add(force);
	}

	this.update = function(){
		if(!this.crashed || this.completed){
			for(var i = 0; i < targets[targets.length-1].length; i++){
				var d = dist(this.pos.x,this.pos.y,targets[targets.length-1][i][0],targets[targets.length-1][i][1]);
				if(d < (width/50)){
					this.completed = true;
					break;
				}
			}
			var track_status = track.inTrack([this.pos.x, this.pos.y]);
			if(!this.completed){
				var old_targ_ind = this.targ_ind;
				this.targ_ind = track_status[1];
				if(!this.targ_ind){
					this.targ_ind = old_targ_ind;
				}
			}
			if(!track_status[0]){
				this.crashed = true;
			}

			if(this.pos.x > width || this.pos.x < 0 || this.pos.y > height || this.pos.y < 0){
				this.crashed = true;
			}

			this.calcFitness();


			if(!this.completed && !this.crashed && (count % vector_mod == 0)){
				this.sensor_results = [];
				this.measured_distances = [];
				for(var i = 0; i < this.sensors.length; i++){
					this.sensor_results.push(this.sensors[i].update([this.old_pos[0],this.old_pos[1]],[this.pos.x, this.pos.y],this.targ_ind));
					this.measured_distances.push(mag(this.pos.x - this.sensor_results[i][0], this.pos.y - this.sensor_results[i][1]));
					if(showSensors){
						stroke("#82AAFF");
						strokeWeight(10 * width/2200);
						point(this.sensor_results[i][0], this.sensor_results[i][1]);
						strokeWeight(11 * width/2200);
					}
				}
				this.old_pos = [this.pos.x, this.pos.y];
				var pred = this.dna.action(this.measured_distances);
				this.applyForce(createVector(pred[0],pred[1]));
				this.vel.add(this.acc);
				this.vel.limit(maxvel);
				if(this.vel.x == 0 && this.vel.y == 0){
					this.crashed = true;
				}
				this.pos.add(this.vel);
				this.acc.mult(0);
			}
		}
	}

	this.show = function(){
		push();
		noStroke();
		if(this.thefittest){
			fill("#A6E22E");
		}
		else{
			fill(255,150);
		}
		translate(this.pos.x, this.pos.y);
		rotate(this.vel.heading());
		rectMode("CENTER");
		beginShape();
		vertex(0, 0);
		vertex(10*width/1466, 5*height/700);
		vertex(0, 10*height/700);
		vertex(0, 7.5*height/700);
		vertex(-20*width/1466, 7.5*height/700);
		vertex(-30*width/1466, 13*height/700);
		vertex(-27*width/1466, 5*height/700);
		vertex(-30*width/1466, -3*height/700);
		vertex(-20*width/1466, 2.5*height/700);
		vertex(0, 2.5*height/700);
		endShape();
		pop();
	}

	this.restart = function(){
		this.thefittest = false;
		this.completed = false;
		this.crashed = false;
		this.targ_ind = 0;
		this.pos = createVector(210*width/2100, 90*height/370);
		this.vel = createVector();
		this.acc = createVector();
		this.fitness = 0;
		this.sensor_results = [];
		this.measured_distances = [];
		this.old_pos = [this.pos.x, this.pos.y];
	}

	this.showNN = function(){
		var dict = [5, 6, 4, 2];
		for(var i = 0; i < all_points_NN.length - 1; i++){
			for(var j = 0; j < all_points_NN[i].length; j++){
				for(var k = 0; k < all_points_NN[i+1].length; k++){
					const s2 = tf.tidy(() => {
						var c_weights = this.dna.genes.layers[i].getWeights()[0].dataSync();
						if(c_weights[(j*dict[i+1]) + k] > 0){
							stroke("green");
						}
						else{
							stroke("red");
						}
						var factor = abs(c_weights[(j*dict[i+1]) + k]);
						strokeWeight((0.3 * width/2200) + ((2 * width/2200) * (factor)));
						line(all_points_NN[i][j][0], all_points_NN[i][j][1], all_points_NN[i+1][k][0], all_points_NN[i+1][k][1]);
					});
				}
			}
		}
		var biases_dict = [0,0,0,0,0];
		const s3 = tf.tidy(() => {
			for(var i = 0; i < this.dna.genes.layers.length; i++){
				var c_biases = this.dna.genes.layers[i].getWeights()[1].dataSync();
				for(var j = 0; j < c_biases.length; j++){
					biases_dict.push(c_biases[j]);
				}
			}
		});
		stroke(color("white"));
		noFill();
		rect(width-(width/1.83), 0+(height/3.3), width/3.66, height/2.82);
		for(var i = 0; i < 5; i++){
			strokeWeight((25 * width/2200) * (1 + 3*biases_dict[i]));
			point(640*width/1280, (240 + (i * 30))*height/620);
		}
		for(var i = 0; i < 6; i++){
			strokeWeight((25 * width/2200) * (1 + 3*biases_dict[5 + i]));
			point(720*width/1280, (225 + (i * 30))*height/620);
		}
		for(var i = 0; i < 4; i++){
			strokeWeight((25 * width/2200) * (1 + 3*biases_dict[11 + i]));
			point(800*width/1280, (255 + (i * 30))*height/620);
		}
		for(var i = 0; i < 2; i++){
			strokeWeight((25 * width/2200) * (1 + 3*biases_dict[15 + i]));
			point(880*width/1280, (285 + (i * 30))*height/620);
		}
		strokeWeight(10 * width/2200);
	}
}
